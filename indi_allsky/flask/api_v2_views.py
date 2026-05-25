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
    # type → (kind, model, date_granularity)
    # date_granularity: 'datetime' = point-in-time image (show time), 'date' = day-span (no time)
    'image':            ('image', 'IndiAllSkyDbImageTable',          'datetime'),
    'panorama':         ('image', 'IndiAllSkyDbPanoramaImageTable',  'datetime'),
    'raw':              ('image', 'IndiAllSkyDbRawImageTable',       'datetime'),
    'keogram':          ('image', 'IndiAllSkyDbKeogramTable',        'date'),
    'startrail':        ('image', 'IndiAllSkyDbStarTrailsTable',     'date'),
    'timelapse':        ('video', 'IndiAllSkyDbVideoTable',          'date'),
    'mini-timelapse':   ('video', 'IndiAllSkyDbMiniVideoTable',      'date'),
    'startrail-video':  ('video', 'IndiAllSkyDbStarTrailsVideoTable','date'),
    'panorama-video':   ('video', 'IndiAllSkyDbPanoramaVideoTable',  'date'),
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

    kind, model_name, granularity = _MEDIA_TYPES[media_type]
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

    if granularity == 'datetime':
        date_obj = getattr(row, 'createDate', None) or getattr(row, 'dayDate', None)
        date_str = date_obj.strftime('%B %d, %Y - %H:%M:%S') if date_obj else ''
    else:
        date_obj = getattr(row, 'dayDate', None) or getattr(row, 'createDate', None)
        date_str = date_obj.strftime('%B %d, %Y') if date_obj else ''

    create_dt = getattr(row, 'createDate', None)
    ts = int(create_dt.timestamp()) if create_dt is not None else None

    return jsonify({
        'kind': kind,
        'type': media_type,
        'id': media_id,
        'url': url,
        'date': date_str,
        'timeofday': timeofday,
        'timestamp': ts,
        'camera_id': camera.id,
    })


@bp_api_v2.route('/generate-mini', methods=['POST'])
@jwt_required()
def generate_mini():
    from .views import AjaxMiniTimelapseGeneratorView
    from flask_jwt_extended import current_user as jwt_user

    if jwt_user is None or not getattr(jwt_user, 'admin', False):
        return jsonify({'failure-message': 'admin required'}), 403

    # Reuse existing logic — but it checks Flask-Login current_user.is_admin.
    # We've already authenticated via JWT, so build the task directly here.
    from .models import IndiAllSkyDbImageTable, IndiAllSkyDbCameraTable
    from .models import TaskQueueQueue, TaskQueueState, IndiAllSkyDbTaskQueueTable
    from sqlalchemy.orm.exc import NoResultFound

    data = request.get_json(silent=True) or {}
    try:
        image_id = int(data['IMAGE_ID'])
        camera_id = int(data['CAMERA_ID'])
        pre_seconds = int(data['PRE_SECONDS'])
        post_seconds = int(data['POST_SECONDS'])
        framerate = float(data['FRAMERATE'])
        note = str(data.get('NOTE', '')).strip()
    except (KeyError, TypeError, ValueError):
        return jsonify({'failure-message': 'missing/invalid fields'}), 400

    if not note:
        return jsonify({'failure-message': 'description required'}), 400

    try:
        IndiAllSkyDbImageTable.query\
            .join(IndiAllSkyDbImageTable.camera)\
            .filter(IndiAllSkyDbCameraTable.id == camera_id)\
            .filter(IndiAllSkyDbImageTable.id == image_id).one()
    except NoResultFound:
        return jsonify({'failure-message': 'image not found'}), 404

    jobdata = {
        'action': 'generateMiniVideo',
        'kwargs': {
            'image_id': image_id,
            'camera_id': camera_id,
            'pre_seconds': pre_seconds,
            'post_seconds': post_seconds,
            'framerate': framerate,
            'note': note,
        },
    }
    task = IndiAllSkyDbTaskQueueTable(
        queue=TaskQueueQueue.VIDEO,
        state=TaskQueueState.MANUAL,
        priority=100,
        data=jobdata,
    )
    db.session.add(task)
    db.session.commit()

    # Reference AjaxMiniTimelapseGeneratorView so static-analysis sees the import
    _ = AjaxMiniTimelapseGeneratorView

    return jsonify({'success-message': 'Job submitted — check Mini-Timelapses in a few minutes'})


@bp_api_v2.route('/charts', methods=['GET'])
@jwt_required()
def charts():
    from .views import JsonChartView
    view = JsonChartView()
    return jsonify(view.get_objects())


@bp_api_v2.route('/realtime-keogram', methods=['GET'])
@jwt_required()
def realtime_keogram():
    import math as _math
    from .base_views import BaseView
    camera_id = int(request.args.get('camera_id', 0))
    if not camera_id:
        return jsonify({'error': 'camera_id required'}), 400
    base = BaseView()
    base.cameraSetup(camera_id=camera_id)
    ext = base.indi_allsky_config.get('IMAGE_FILE_TYPE', 'jpg')
    url = 'images/ccd_{0}/realtime_keogram.{1}'.format(base.camera.uuid, ext)
    refresh_ms = int(_math.ceil(base.indi_allsky_config.get('CCD_EXPOSURE_MAX', 15.0)) * 1000) + 1000
    return jsonify({'url': url, 'refresh_ms': refresh_ms})


@bp_api_v2.route('/longterm-keogram-generate', methods=['POST'])
@jwt_required()
def longterm_keogram_generate():
    """Wraps the JsonLongTermKeogramView — kicks off keogram generation."""
    from .views import JsonLongTermKeogramView
    v = JsonLongTermKeogramView()
    return v.dispatch_request()


@bp_api_v2.route('/longterm-keogram', methods=['GET'])
@jwt_required()
def longterm_keogram_cached():
    import time as _time
    from pathlib import Path as _Path
    from .base_views import BaseView
    camera_id = int(request.args.get('camera_id', 0))
    if not camera_id:
        return jsonify({'error': 'camera_id required'}), 400
    base = BaseView()
    base.cameraSetup(camera_id=camera_id)
    p = _Path(app.config['INDI_ALLSKY_IMAGE_FOLDER']).joinpath(
        'ccd_{0}'.format(base.camera.uuid), 'longterm_keogram.jpg',
    )
    if not p.is_file():
        return jsonify({'url': None, 'age': None})
    age_s = _time.time() - p.stat().st_mtime
    days = int(age_s / 86400)
    hours = int((age_s % 86400) / 3600)
    minutes = int(((age_s % 86400) % 3600) / 60)
    age_str = 'Generated {0} days, {1} hours, {2} minutes ago'.format(days, hours, minutes)
    url = 'images/ccd_{0}/longterm_keogram.jpg'.format(base.camera.uuid)
    return jsonify({'url': url, 'age': age_str})


def _set_session_camera(camera_id):
    """TemplateView reads session['camera_id'] in __init__. Set it so the view
    picks up the right camera when instantiated from a JWT-authed request."""
    from flask import session as _session
    _session['camera_id'] = int(camera_id)


@bp_api_v2.route('/sensor-panel', methods=['GET'])
@jwt_required()
def sensor_panel():
    from .views import SensorPanelView

    camera_id = int(request.args.get('camera_id', 0))
    if camera_id:
        _set_session_camera(camera_id)

    v = SensorPanelView(template_name='unused')
    ctx = v.get_context()

    last_update = ctx.get('last_update')
    return jsonify({
        'last_update': str(last_update) if last_update else None,
        'last_update_age_s': ctx.get('last_update_age_s'),
        'user_rows': ctx.get('user_rows', []),
        'temp_rows': ctx.get('temp_rows', []),
        'show_all': ctx.get('show_all', False),
    })


@bp_api_v2.route('/support-info', methods=['GET'])
@jwt_required()
def support_info():
    from .views import JsonSupportInfoView
    v = JsonSupportInfoView()
    return v.dispatch_request()


@bp_api_v2.route('/log', methods=['POST'])
@jwt_required()
def log_view():
    from .views import JsonLogView
    v = JsonLogView()
    return v.dispatch_request()


@bp_api_v2.route('/file-space-usage', methods=['GET'])
@jwt_required()
def file_space_usage():
    from .views import FileSpaceUsageView
    camera_id = int(request.args.get('camera_id', 0))
    if camera_id:
        _set_session_camera(camera_id)
    v = FileSpaceUsageView(template_name='unused')
    ctx = v.get_context()
    return jsonify({'days': ctx.get('days_fileSize_dict', {})})


@bp_api_v2.route('/camera-info', methods=['GET'])
@jwt_required()
def camera_info():
    from .views import CameraLensView
    camera_id = int(request.args.get('camera_id', 0))
    if camera_id:
        _set_session_camera(camera_id)
    v = CameraLensView(template_name='unused')
    ctx = v.get_context()
    camera = ctx['camera']
    return jsonify({
        'name': camera.name,
        'friendlyName': camera.friendlyName,
        'driver': camera.driver,
        'owner': ctx.get('owner'),
        'cfa': ctx.get('camera_cfa'),
        'width': camera.width,
        'height': camera.height,
        'pixelSize': camera.pixelSize,
        'bits': camera.bits,
        'minGain': camera.minGain,
        'maxGain': camera.maxGain,
        'minExposure': camera.minExposure,
        'maxExposure': camera.maxExposure,
        'lensName': getattr(camera, 'lensName', None),
        'lensFocalLength': getattr(camera, 'lensFocalLength', None),
        'lensFocalRatio': getattr(camera, 'lensFocalRatio', None),
        'lensAperture': ctx.get('lensAperture'),
        'lensImageCircle': getattr(camera, 'lensImageCircle', None),
        'latitude': camera.latitude,
        'longitude': camera.longitude,
        'elevation': camera.elevation,
        'tz': camera.tz,
        'camera_width_mm': ctx.get('camera_width_mm'),
        'camera_height_mm': ctx.get('camera_height_mm'),
        'camera_diagonal_mm': ctx.get('camera_diagonal_mm'),
        'arcsec_pixel': ctx.get('arcsec_pixel'),
        'arcsec_um': ctx.get('arcsec_um'),
        'deg2_px': ctx.get('deg2_px'),
        'image_circle_diameter': ctx.get('image_circle_diameter'),
        'image_circle_diameter_mm': ctx.get('image_circle_diameter_mm'),
        'deg_fov_width': ctx.get('deg_fov_width'),
        'deg_fov_height': ctx.get('deg_fov_height'),
        'deg_fov_diagonal': ctx.get('deg_fov_diagonal'),
        'createDate': str(camera.createDate) if camera.createDate else None,
        'connectDate': str(camera.connectDate) if camera.connectDate else None,
    })


@bp_api_v2.route('/virtualsky-config', methods=['GET'])
@jwt_required()
def virtualsky_config():
    """Camera location + per-camera VirtualSky defaults used by the overlay."""
    from datetime import datetime as _dt
    from .base_views import BaseView

    camera_id = int(request.args.get('camera_id', 0))
    if not camera_id:
        return jsonify({'error': 'camera_id required'}), 400

    base = BaseView()
    base.cameraSetup(camera_id=camera_id)
    cam = base.camera
    data = dict(cam.data) if cam.data else {}

    privacy = base.indi_allsky_config.get('PRIVACY_MODE')
    latitude  = float(round(cam.latitude))  if privacy else cam.latitude
    longitude = float(round(cam.longitude)) if privacy else cam.longitude

    time_offset = cam.utc_offset - _dt.now().astimezone().utcoffset().total_seconds()

    return jsonify({
        'camera_latitude':  latitude,
        'camera_longitude': longitude,
        'time_offset':      time_offset,
        'defaults': {
            'AZIMUTH_ANGLE':          cam.az,
            'IMAGE_CIRCLE_DIAMETER':  data.get('vs_image_circle_diameter', 3500),
            'LATITUDE_OFFSET':        data.get('vs_latitude_offset', 0.0),
            'LONGITUDE_OFFSET':       data.get('vs_longitude_offset', 0.0),
            'OFFSET_X':               data.get('vs_offset_x', 0.0),
            'OFFSET_Y':               data.get('vs_offset_y', 0.0),
            'MAGNITUDE':              data.get('vs_magnitude', 6.0),
            'CONSTELLATIONS':         data.get('vs_constellations', True),
            'CONSTELLATIONLABELS':    data.get('vs_constellationlabels', False),
            'SHOWSTARS':              data.get('vs_showstars', True),
            'SHOWSTARLABELS':         data.get('vs_showstarlabels', True),
            'SHOWPLANETS':            data.get('vs_showplanets', True),
            'SHOWPLANETLABELS':       data.get('vs_showplanetlabels', True),
        },
    })


@bp_api_v2.route('/image-lag', methods=['GET'])
@jwt_required()
def image_lag():
    """Lightweight wrapper around ImageLagView's data: list of recent images with lag info."""
    from .base_views import BaseView
    from .models import IndiAllSkyDbImageTable, IndiAllSkyDbCameraTable
    from sqlalchemy import and_
    from datetime import timedelta

    camera_id = int(request.args.get('camera_id', 0))
    if not camera_id:
        return jsonify({'error': 'camera_id required'}), 400

    history_seconds = int(request.args.get('limit_s', 3600))
    history_seconds = min(history_seconds, 86400)

    base = BaseView()
    base.cameraSetup(camera_id=camera_id)

    since = base.camera_now - timedelta(seconds=history_seconds)
    rows = IndiAllSkyDbImageTable.query\
        .join(IndiAllSkyDbImageTable.camera)\
        .filter(and_(
            IndiAllSkyDbCameraTable.id == camera_id,
            IndiAllSkyDbImageTable.createDate > since,
        ))\
        .order_by(IndiAllSkyDbImageTable.createDate.desc())\
        .limit(2000)\
        .all()

    image_list = []
    prev_ts = None
    for r in rows:
        ts = r.createDate.timestamp()
        # rows are desc, so lag = (this image's ts) - (next-older image's ts)
        # we compute as we go by storing prev_ts (the more-recent one we saw)
        if prev_ts is not None:
            lag = prev_ts - ts
        else:
            lag = None
        image_list.append({
            'id': r.id,
            'createDate': r.createDate.strftime('%Y-%m-%d %H:%M:%S'),
            'exposure': r.exposure,
            'lag_seconds': lag,
        })
        prev_ts = ts

    return jsonify({'image_list': image_list, 'count': len(image_list)})


@bp_api_v2.route('/adu', methods=['GET'])
@jwt_required()
def adu():
    """15-minute rolling ADU stats. Wraps RollingAduView."""
    from .views import RollingAduView
    camera_id = int(request.args.get('camera_id', 0))
    if camera_id:
        _set_session_camera(camera_id)
    v = RollingAduView(template_name='unused')
    ctx = v.get_context()
    rows = []
    for r in ctx.get('rolling_adu_q', []):
        dt = getattr(r, 'dt', None)
        rows.append({
            'dt'          : dt.strftime('%Y-%m-%d %H:%M') if dt else '',
            'i_count'     : int(r.i_count) if r.i_count is not None else 0,
            'exposure_avg': float(r.exposure_avg) if r.exposure_avg is not None else None,
            'adu_avg'     : float(r.adu_avg) if r.adu_avg is not None else None,
            'jsqm_avg'    : float(r.jsqm_avg) if r.jsqm_avg is not None else None,
            'stars_avg'   : float(r.stars_avg) if r.stars_avg is not None else None,
        })
    return jsonify({'rows': rows})


@bp_api_v2.route('/darks', methods=['GET'])
@jwt_required()
def darks():
    """Dark frame + bad pixel map listings. Wraps DarkFramesView."""
    from .views import DarkFramesView
    camera_id = int(request.args.get('camera_id', 0))
    if camera_id:
        _set_session_camera(camera_id)
    v = DarkFramesView(template_name='unused')
    ctx = v.get_context()

    def _fmt(entries):
        out = []
        for e in entries:
            created = e.get('createDate')
            out.append({
                'id'         : e.get('id'),
                'camera_name': e.get('camera_name'),
                'createDate' : created.strftime('%Y-%m-%d %H:%M:%S') if created else '',
                'active'     : bool(e.get('active')),
                'bitdepth'   : e.get('bitdepth'),
                'gain'       : e.get('gain'),
                'exposure'   : e.get('exposure'),
                'binmode'    : e.get('binmode'),
                'width'      : e.get('width'),
                'height'     : e.get('height'),
                'temp'       : e.get('temp'),
                'adu'        : e.get('adu'),
                'filename'   : e.get('filename'),
                'url'        : e.get('url'),
                'hot_pixels' : e.get('hot_pixels'),
                'method'     : e.get('method', ''),
                'size_mb'    : e.get('size_mb'),
            })
        return out

    return jsonify({
        'darks': _fmt(ctx.get('darkframe_list', [])),
        'bpm'  : _fmt(ctx.get('bpm_list', [])),
    })


@bp_api_v2.route('/system-info', methods=['GET'])
@jwt_required()
def system_info():
    """System info dashboard data. Wraps SystemInfoView."""
    from .views import SystemInfoView
    camera_id = int(request.args.get('camera_id', 0))
    if camera_id:
        _set_session_camera(camera_id)
    v = SystemInfoView(template_name='unused')
    ctx = v.get_context()
    now = ctx.get('now')
    timedate1 = ctx.get('timedate1_dict') or {}

    def _service(active_key, unit_key):
        return {
            'active': ctx.get(active_key),
            'unit'  : ctx.get(unit_key),
        }

    return jsonify({
        'release'     : ctx.get('release'),
        'uptime'      : ctx.get('uptime_str'),
        'system_type' : ctx.get('system_type'),
        'systemd_target': ctx.get('systemd_target'),
        'cpu_count'   : ctx.get('cpu_count'),
        'cpu_usage'   : ctx.get('cpu_usage'),
        'cpu_bits'    : ctx.get('cpu_bits'),
        'cpu_load5'   : ctx.get('cpu_load5'),
        'cpu_load10'  : ctx.get('cpu_load10'),
        'cpu_load15'  : ctx.get('cpu_load15'),
        'mem_total'   : ctx.get('mem_total'),
        'mem_usage'   : ctx.get('mem_usage'),
        'swap_total'  : ctx.get('swap_total'),
        'swap_usage'  : ctx.get('swap_usage'),
        'fs_data'     : ctx.get('fs_data', []),
        'temp_list'   : ctx.get('temp_list', []),
        'fan_list'    : ctx.get('fan_list', []),
        'net_list'    : [
            {
                'name' : n.get('name'),
                'inet4': n.get('inet4', []),
                'inet6': n.get('inet6', []),
            }
            for n in ctx.get('net_list', [])
        ],
        'python_version'    : ctx.get('python_version'),
        'python_platform'   : ctx.get('python_platform'),
        'flask_version'     : ctx.get('flask_version'),
        'gunicorn_version'  : ctx.get('gunicorn_version'),
        'cv2_version'       : ctx.get('cv2_version'),
        'numpy_version'     : ctx.get('numpy_version'),
        'astropy_version'   : ctx.get('astropy_version'),
        'ephem_version'     : ctx.get('ephem_version'),
        'cryptography_version': ctx.get('cryptography_version'),
        'dbus_version'      : ctx.get('dbus_version'),
        'pycurl_version'    : ctx.get('pycurl_version'),
        'pahomqtt_version'  : ctx.get('pahomqtt_version'),
        'skyfield_version'  : ctx.get('skyfield_version'),
        'indiserver_service' : _service('indiserver_service_activestate', 'indiserver_service_unitstate'),
        'indiserver_timer'   : _service('indiserver_timer_activestate',   'indiserver_timer_unitstate'),
        'allsky_service'     : _service('indi_allsky_service_activestate', 'indi_allsky_service_unitstate'),
        'allsky_timer'       : _service('indi_allsky_timer_activestate',   'indi_allsky_timer_unitstate'),
        'gunicorn_service'   : _service('gunicorn_indi_allsky_service_activestate', 'gunicorn_indi_allsky_service_unitstate'),
        'gunicorn_socket'    : _service('gunicorn_indi_allsky_socket_activestate',  'gunicorn_indi_allsky_socket_unitstate'),
        'indiserver_next_trigger': str(ctx.get('indiserver_next_trigger') or ''),
        'allsky_next_trigger'    : str(ctx.get('indi_allsky_next_trigger') or ''),
        'now'         : str(now) if now else None,
        'timezone'    : timedate1.get('Timezone'),
        'timedate1'   : {k: str(v) for k, v in timedate1.items()},
    })


@bp_api_v2.route('/drives', methods=['GET'])
@jwt_required()
def drives_list():
    """List drives via udisks2. Wraps DriveManagerView for env check."""
    from .views import DriveManagerView
    v = DriveManagerView(template_name='unused')
    ctx = v.get_context()
    udisks2 = bool(ctx.get('udisks2_installed'))

    drives_data = []
    if udisks2:
        import dbus as _dbus
        try:
            bus = _dbus.SystemBus()
            udisks_root = bus.get_object('org.freedesktop.UDisks2', '/org/freedesktop/UDisks2')
            iface = _dbus.Interface(udisks_root, 'org.freedesktop.DBus.ObjectManager')
            object_paths = iface.GetManagedObjects()

            drive_map = {}
            for op, ifaces in object_paths.items():
                op_s = str(op)
                if not op_s.startswith('/org/freedesktop/UDisks2/drives/'):
                    continue
                drv = ifaces.get('org.freedesktop.UDisks2.Drive', {})
                drv_id = str(drv.get('Id', ''))
                if not drv_id:
                    continue
                drive_map[op_s] = {
                    'id'      : drv_id,
                    'vendor'  : str(drv.get('Vendor', '')),
                    'model'   : str(drv.get('Model', '')),
                    'size'    : int(drv.get('Size', 0)),
                    'connection_bus': str(drv.get('ConnectionBus', '')),
                    'serial'  : str(drv.get('Serial', '')),
                    'removable': bool(drv.get('Removable', False)),
                    'ejectable': bool(drv.get('Ejectable', False)),
                    'can_power_off': bool(drv.get('CanPowerOff', False)),
                    'block_devices': [],
                }

            for op, ifaces in object_paths.items():
                op_s = str(op)
                if not op_s.startswith('/org/freedesktop/UDisks2/block_devices/'):
                    continue
                blk = ifaces.get('org.freedesktop.UDisks2.Block', {})
                fs = ifaces.get('org.freedesktop.UDisks2.Filesystem', {})
                drive_path = str(blk.get('Drive', ''))
                parent = drive_map.get(drive_path)
                if not parent:
                    continue
                mounts = fs.get('MountPoints', []) if fs else []
                mount_strs = []
                for m in mounts:
                    try:
                        mount_strs.append(bytes(m).rstrip(b'\x00').decode('utf-8', 'replace'))
                    except Exception:
                        mount_strs.append(str(m))
                parent['block_devices'].append({
                    'device' : op_s.rsplit('/', 1)[-1],
                    'mounts' : mount_strs,
                    'label'  : str(blk.get('IdLabel', '') or ''),
                    'fstype' : str(blk.get('IdType', '') or ''),
                    'size'   : int(blk.get('Size', 0) or 0),
                })

            drives_data = list(drive_map.values())
        except Exception as e:
            app.logger.error('drives_list error: %s', str(e))

    return jsonify({'udisks2': udisks2, 'drives': drives_data})


@bp_api_v2.route('/drives/action', methods=['POST'])
@jwt_required()
def drives_action():
    from flask_jwt_extended import current_user as jwt_user
    if jwt_user is None or not getattr(jwt_user, 'admin', False):
        return jsonify({'failure-message': 'admin required'}), 403
    from flask import g as _g
    from .views import AjaxDriveManagerView
    _g._login_user = jwt_user
    return AjaxDriveManagerView().dispatch_request()


@bp_api_v2.route('/generate/days', methods=['GET'])
@jwt_required()
def generate_days():
    """Return distinct days+ToD entries with timelapse/keogram/panorama status flags."""
    from .forms import IndiAllskyTimelapseGeneratorForm
    camera_id = int(request.args.get('camera_id', 0))
    if not camera_id:
        return jsonify({'error': 'camera_id required'}), 400
    form = IndiAllskyTimelapseGeneratorForm(data={'CAMERA_ID': camera_id}, camera_id=camera_id)
    return jsonify({
        'days': [{'value': v, 'label': l} for v, l in form.DAY_SELECT.choices],
    })


@bp_api_v2.route('/generate/recent-tasks', methods=['GET'])
@jwt_required()
def generate_recent_tasks():
    from .views import TimelapseGeneratorView
    camera_id = int(request.args.get('camera_id', 0))
    if camera_id:
        _set_session_camera(camera_id)
    v = TimelapseGeneratorView(template_name='unused')
    ctx = v.get_context()
    tasks = []
    for t in ctx.get('task_list', []):
        created = t.get('createDate')
        tasks.append({
            'id'         : t.get('id'),
            'createDate' : created.strftime('%Y-%m-%d %H:%M:%S') if created else '',
            'queue'      : t.get('queue'),
            'action'     : t.get('action'),
            'state'      : t.get('state'),
            'result'     : t.get('result'),
        })
    return jsonify({'tasks': tasks})


@bp_api_v2.route('/generate/submit', methods=['POST'])
@jwt_required()
def generate_submit():
    from flask_jwt_extended import current_user as jwt_user
    if jwt_user is None or not getattr(jwt_user, 'admin', False):
        return jsonify({'failure-message': 'admin required'}), 403
    # flask-login's current_user resolves from flask.g._login_user first
    # (see flask_login.utils._get_user). Set it for the duration of this
    # request so the legacy AjaxTimelapseGeneratorView.dispatch_request sees
    # an admin user — without modifying the legacy view or touching the session.
    from flask import g as _g
    from .views import AjaxTimelapseGeneratorView
    _g._login_user = jwt_user
    return AjaxTimelapseGeneratorView().dispatch_request()


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
