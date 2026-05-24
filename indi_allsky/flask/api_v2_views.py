import time
import random
from datetime import datetime

from passlib.hash import argon2

from flask import Blueprint
from flask import jsonify
from flask import request
from flask import current_app as app

from flask_jwt_extended import create_access_token
from flask_jwt_extended import create_refresh_token
from flask_jwt_extended import set_refresh_cookies
from flask_jwt_extended import unset_jwt_cookies
from flask_jwt_extended import jwt_required
from flask_jwt_extended import current_user
from flask_jwt_extended import get_jwt_identity

from . import db
from .models import IndiAllSkyDbUserTable
from .models import IndiAllSkyDbCameraTable


bp_api_v2 = Blueprint(
    'api_v2_indi_allsky',
    __name__,
    url_prefix='/indi-allsky/api/v2',
)


def _user_dto(user):
    return {
        'id'       : user.id,
        'username' : user.username,
        'name'     : user.name,
        'email'    : user.email,
        'admin'    : bool(user.admin),
        'staff'    : bool(user.staff),
    }


@bp_api_v2.route('/auth/login', methods=['POST'])
def login():
    # timing-attack jitter, same as auth_views.LoginView.post
    time.sleep(random.randint(0, 250) / 1000.0)

    data = request.get_json(silent=True) or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'error': 'username and password required'}), 400

    user = IndiAllSkyDbUserTable.query\
        .filter(IndiAllSkyDbUserTable.username == username)\
        .first()

    if not user or not argon2.verify(password, user.password):
        app.logger.warning('api_v2 login failed for: %s', username)
        return jsonify({'error': 'invalid username or password'}), 401

    if not user.is_active:
        return jsonify({'error': 'user is disabled'}), 403

    app.logger.info('api_v2 login success: %s', user.username)

    remote_addr = request.headers.get('X-Forwarded-For') or request.remote_addr
    user.loginDate = datetime.now()
    user.loginIp = remote_addr
    db.session.commit()

    identity = str(user.id)
    claims = {'admin': bool(user.admin), 'staff': bool(user.staff)}

    access = create_access_token(identity=identity, additional_claims=claims)
    refresh = create_refresh_token(identity=identity)

    resp = jsonify({
        'access_token' : access,
        'user'         : _user_dto(user),
    })
    set_refresh_cookies(resp, refresh)
    return resp


@bp_api_v2.route('/auth/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    user = IndiAllSkyDbUserTable.query.get(int(get_jwt_identity()))
    if not user or not user.is_active:
        return jsonify({'error': 'user not found or disabled'}), 401

    claims = {'admin': bool(user.admin), 'staff': bool(user.staff)}
    access = create_access_token(identity=str(user.id), additional_claims=claims)
    return jsonify({'access_token': access})


@bp_api_v2.route('/auth/logout', methods=['POST'])
def logout():
    resp = jsonify({'ok': True})
    unset_jwt_cookies(resp)
    return resp


@bp_api_v2.route('/auth/me', methods=['GET'])
@jwt_required()
def me():
    if current_user is None:
        return jsonify({'error': 'user not found'}), 404
    return jsonify(_user_dto(current_user))


@bp_api_v2.route('/cameras', methods=['GET'])
@jwt_required()
def cameras():
    rows = IndiAllSkyDbCameraTable.query\
        .filter(IndiAllSkyDbCameraTable.hidden == False)\
        .order_by(IndiAllSkyDbCameraTable.id.asc())\
        .all()
    return jsonify([
        {
            'id'           : c.id,
            'name'         : c.name,
            'friendlyName' : c.friendlyName,
            'width'        : c.width,
            'height'       : c.height,
        }
        for c in rows
    ])


@bp_api_v2.route('/latest-image', methods=['GET'])
@jwt_required()
def latest_image():
    # reuse existing JsonLatestImageView logic — it reads request.args for camera_id/limit_s/night
    from .views import JsonLatestImageView
    view = JsonLatestImageView()
    return jsonify(view.get_objects())


@bp_api_v2.route('/loop', methods=['GET'])
@jwt_required()
def loop():
    # reuse existing JsonImageLoopView — reads camera_id/limit_s/limit/timestamp from request.args
    from .views import JsonImageLoopView
    view = JsonImageLoopView()
    return jsonify(view.get_objects())


@bp_api_v2.route('/gallery', methods=['POST'])
@jwt_required()
def gallery():
    # reuse existing AjaxGalleryViewerView — reads JSON body with CAMERA_ID/YEAR_SELECT/.../FILTER_DETECTIONS
    from .views import AjaxGalleryViewerView
    view = AjaxGalleryViewerView()
    return view.dispatch_request()


@bp_api_v2.route('/imageviewer', methods=['POST'])
@jwt_required()
def imageviewer():
    # reuse existing AjaxImageViewerView — same body shape as gallery
    from .views import AjaxImageViewerView
    view = AjaxImageViewerView()
    return view.dispatch_request()


def _video_response(form_video_viewer, request_json, has_timeofday):
    """Build a videoviewer response, auto-populating YEAR_SELECT on initial load.

    The legacy AjaxVideoViewerView.else branch returns an empty MONTH_SELECT
    when no YEAR_SELECT is sent (it relied on the page template to pre-fill
    the year). The React UI has no such pre-fill, so we do it here.
    """
    form_year      = int(request_json.get('YEAR_SELECT') or 0)
    form_month     = int(request_json.get('MONTH_SELECT') or 0)
    form_timeofday = str(request_json.get('TIMEOFDAY_SELECT', '')) if has_timeofday else ''

    json_data = {}

    # If no year provided, look up available years and pick the latest.
    if not form_year:
        years = form_video_viewer.getYears()
        if not years:
            return {
                'YEAR_SELECT': (('', 'None'),),
                'MONTH_SELECT': (('', 'None'),),
                'video_list': tuple(),
            }
        json_data['YEAR_SELECT'] = years
        form_year = int(years[0][0])

    if form_month:
        form_datetime = datetime.strptime('{0} {1}'.format(form_year, form_month), '%Y %m')
        if has_timeofday:
            json_data['video_list'] = form_video_viewer.getVideos(
                form_datetime.year, form_datetime.month, form_timeofday,
            )
        else:
            json_data['video_list'] = form_video_viewer.getVideos(
                form_datetime.year, form_datetime.month,
            )
    else:
        json_data['MONTH_SELECT'] = form_video_viewer.getMonths(form_year)
        if json_data['MONTH_SELECT']:
            month = int(json_data['MONTH_SELECT'][0][0])
            if has_timeofday:
                json_data['video_list'] = form_video_viewer.getVideos(
                    form_year, month, form_timeofday,
                )
            else:
                json_data['video_list'] = form_video_viewer.getVideos(form_year, month)
        else:
            json_data['video_list'] = tuple()

    return json_data


@bp_api_v2.route('/videoviewer', methods=['POST'])
@jwt_required()
def videoviewer():
    from .views import AjaxVideoViewerView
    from .forms import IndiAllskyVideoViewer

    base = AjaxVideoViewerView()
    camera_id = int(request.json['CAMERA_ID'])
    base.cameraSetup(camera_id=camera_id)

    local = True
    if base.web_nonlocal_images:
        if base.web_local_images_admin and base.verify_admin_network():
            pass
        else:
            local = False

    form_viewer = IndiAllskyVideoViewer(
        data=request.json, camera_id=camera_id, s3_prefix=base.s3_prefix, local=local,
    )
    return jsonify(_video_response(form_viewer, request.json, has_timeofday=True))


@bp_api_v2.route('/mini-videoviewer', methods=['POST'])
@jwt_required()
def mini_videoviewer():
    from .views import AjaxMiniVideoViewerView
    from .forms import IndiAllskyMiniVideoViewer

    base = AjaxMiniVideoViewerView()
    camera_id = int(request.json['CAMERA_ID'])
    base.cameraSetup(camera_id=camera_id)

    local = True
    if base.web_nonlocal_images:
        if base.web_local_images_admin and base.verify_admin_network():
            pass
        else:
            local = False

    form_viewer = IndiAllskyMiniVideoViewer(
        data=request.json, camera_id=camera_id, s3_prefix=base.s3_prefix, local=local,
    )
    return jsonify(_video_response(form_viewer, request.json, has_timeofday=False))


@bp_api_v2.route('/latest-panorama', methods=['GET'])
@jwt_required()
def latest_panorama():
    from .views import JsonLatestPanoramaView
    view = JsonLatestPanoramaView()
    return jsonify(view.get_objects())


@bp_api_v2.route('/panorama-loop', methods=['GET'])
@jwt_required()
def panorama_loop():
    from .views import JsonPanoramaLoopView
    view = JsonPanoramaLoopView()
    return jsonify(view.get_objects())


_MEDIA_TYPES = {
    # kind, model attribute on .views module, has_dayDate (vs createDate for label)
    'image':            ('image', 'IndiAllSkyDbImageTable'),
    'panorama':         ('image', 'IndiAllSkyDbPanoramaImageTable'),
    'keogram':          ('image', 'IndiAllSkyDbKeogramTable'),
    'startrail':        ('image', 'IndiAllSkyDbStarTrailsTable'),
    'raw':              ('image', 'IndiAllSkyDbRawImageTable'),
    'timelapse':        ('video', 'IndiAllSkyDbVideoTable'),
    'mini-timelapse':   ('video', 'IndiAllSkyDbMiniVideoTable'),
    'startrail-video':  ('video', 'IndiAllSkyDbStarTrailsVideoTable'),
    'panorama-video':   ('video', 'IndiAllSkyDbPanoramaVideoTable'),
}


@bp_api_v2.route('/media', methods=['GET'])
@jwt_required()
def media():
    from sqlalchemy.orm.exc import NoResultFound
    from . import models as _models
    from .base_views import BaseView

    media_type = request.args.get('type', '')
    media_id = int(request.args.get('id', 0))

    if media_type not in _MEDIA_TYPES:
        return jsonify({'error': 'unknown media type'}), 400
    if media_id <= 0:
        return jsonify({'error': 'id required'}), 400

    kind, model_name = _MEDIA_TYPES[media_type]
    Model = getattr(_models, model_name)

    try:
        row = Model.query.filter(Model.id == media_id).one()
    except NoResultFound:
        return jsonify({'error': 'not found'}), 404

    # Need camera_id to resolve s3_prefix + local-asset rules. The row's FK is
    # named differently across tables, but the relationship is always `.camera`.
    camera = getattr(row, 'camera', None)
    if camera is None:
        return jsonify({'error': 'no camera for media'}), 500

    base = BaseView()
    base.cameraSetup(camera_id=camera.id)

    local = True
    if base.web_nonlocal_images:
        if base.web_local_images_admin and base.verify_admin_network():
            pass
        else:
            local = False

    try:
        url = str(row.getUrl(s3_prefix=base.s3_prefix, local=local))
    except (ValueError, AttributeError) as e:
        app.logger.error('media url error: %s', str(e))
        return jsonify({'error': 'url unavailable'}), 500

    night = getattr(row, 'night', None)
    timeofday = 'Night' if night else ('Day' if night is False else '')

    date_obj = getattr(row, 'dayDate', None) or getattr(row, 'createDate', None)
    if date_obj is not None:
        if kind == 'image':
            date_str = date_obj.strftime('%B %d, %Y - %H:%M:%S')
        else:
            date_str = date_obj.strftime('%B %d, %Y')
    else:
        date_str = ''

    return jsonify({
        'kind': kind,
        'type': media_type,
        'id': media_id,
        'url': url,
        'date': date_str,
        'timeofday': timeofday,
    })


@bp_api_v2.route('/status', methods=['GET'])
@jwt_required()
def status():
    # reuse existing AjaxStatusUpdateView. Its dispatch_request reads request.args['camera_id']
    # and returns a Flask response with {status_text: HTML}
    from .views import AjaxStatusUpdateView
    view = AjaxStatusUpdateView()
    return view.dispatch_request()


@bp_api_v2.route('/notifications', methods=['GET'])
@jwt_required()
def notifications_list():
    from .views import AjaxNotificationView
    view = AjaxNotificationView()
    return view.get()  # reads request.args['camera_id']


@bp_api_v2.route('/notifications/ack', methods=['POST'])
@jwt_required()
def notifications_ack():
    from .views import AjaxNotificationView
    view = AjaxNotificationView()
    data = request.get_json(silent=True) or {}
    camera_id = int(data.get('camera_id', 0))
    ack_id = int(data.get('ack_id', 0))
    if not ack_id:
        return jsonify({'error': 'ack_id required'}), 400

    from .models import IndiAllSkyDbNotificationTable
    from sqlalchemy.orm.exc import NoResultFound
    try:
        notice = IndiAllSkyDbNotificationTable.query\
            .filter(IndiAllSkyDbNotificationTable.id == ack_id).one()
        notice.setAck()
    except NoResultFound:
        pass

    return view.get(camera_id=camera_id)
