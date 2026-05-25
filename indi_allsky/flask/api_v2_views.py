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
    """Build a videoviewer response, auto-populating YEAR_SELECT to the latest
    available year on initial load (when the caller sends none)."""
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
    """Dark frame + bad pixel map listings for the given camera."""
    from .models import (
        IndiAllSkyDbDarkFrameTable,
        IndiAllSkyDbBadPixelMapTable,
        IndiAllSkyDbCameraTable,
    )

    camera_id = int(request.args.get('camera_id', 0))
    if not camera_id:
        return jsonify({'error': 'camera_id required'}), 400

    def _row(entry):
        try:
            fp = entry.getFilesystemPath()
            file_size = fp.stat().st_size
        except (OSError, ValueError):
            file_size = 0
        try:
            url = str(entry.getUrl())
        except (ValueError, AttributeError):
            url = None
        data = entry.data if isinstance(entry.data, dict) else {}
        return {
            'id'         : entry.id,
            'camera_name': entry.camera.name if entry.camera else None,
            'createDate' : entry.createDate.strftime('%Y-%m-%d %H:%M:%S') if entry.createDate else '',
            'active'     : bool(entry.active),
            'bitdepth'   : entry.bitdepth,
            'gain'       : entry.gain,
            'exposure'   : entry.exposure,
            'binmode'    : entry.binmode,
            'width'      : entry.width,
            'height'     : entry.height,
            'temp'       : entry.temp,
            'adu'        : entry.adu,
            'filename'   : entry.filename,
            'url'        : url,
            'hot_pixels' : data.get('hot_pixels', -1),
            'method'     : data.get('method', ''),
            'size_mb'    : file_size / 1024 / 1024,
        }

    darks_q = IndiAllSkyDbDarkFrameTable.query\
        .join(IndiAllSkyDbCameraTable)\
        .filter(IndiAllSkyDbCameraTable.id == camera_id)\
        .order_by(
            IndiAllSkyDbDarkFrameTable.gain.asc(),
            IndiAllSkyDbDarkFrameTable.exposure.asc(),
        )

    bpm_q = IndiAllSkyDbBadPixelMapTable.query\
        .join(IndiAllSkyDbCameraTable)\
        .filter(IndiAllSkyDbCameraTable.id == camera_id)\
        .order_by(
            IndiAllSkyDbBadPixelMapTable.gain.asc(),
            IndiAllSkyDbBadPixelMapTable.exposure.asc(),
        )

    return jsonify({
        'darks': [_row(e) for e in darks_q],
        'bpm'  : [_row(e) for e in bpm_q],
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


_DRIVES_PROTECTED_FS = (
    '/', '/boot', '/boot/firmware', '/boot/efi',
    '/var', '/home', '/tmp', '/var/tmp',
    '/run', '/dev', '/dev/shm',
)


def _drives_decode_bytes(seq):
    """UDisks2 returns NUL-terminated byte arrays (dbus.Array of Byte). Decode."""
    try:
        return bytes(seq).rstrip(b'\x00').decode('utf-8', 'replace')
    except Exception:
        return str(seq)


def _drives_collect():
    """Walk UDisks2 dbus and build a list of drives + their block devices."""
    import dbus as _dbus

    try:
        bus = _dbus.SystemBus()
        udisks_root = bus.get_object('org.freedesktop.UDisks2', '/org/freedesktop/UDisks2')
        iface = _dbus.Interface(udisks_root, 'org.freedesktop.DBus.ObjectManager')
        object_paths = iface.GetManagedObjects()
    except _dbus.exceptions.DBusException as e:
        app.logger.error('drives dbus exception: %s', str(e))
        return []

    from datetime import datetime as _dt
    drive_map = {}
    for op, ifaces in object_paths.items():
        op_s = str(op)
        if not op_s.startswith('/org/freedesktop/UDisks2/drives/'):
            continue
        drv = ifaces.get('org.freedesktop.UDisks2.Drive', {})
        drv_id = str(drv.get('Id', ''))
        if not drv_id:
            continue

        # UDisks2 reports TimeDetected / TimeMediaDetected as microseconds since epoch.
        def _ts(v):
            try:
                v = int(v)
                if v <= 0:
                    return None
                return _dt.fromtimestamp(v / 1_000_000).strftime('%Y-%m-%d %H:%M:%S')
            except (TypeError, ValueError):
                return None

        media_compat = drv.get('MediaCompatibility', []) or []
        try:
            media_compat = [str(x) for x in media_compat]
        except TypeError:
            media_compat = []

        drive_map[op_s] = {
            'id'           : drv_id,
            'vendor'       : str(drv.get('Vendor', '')) or '[no vendor]',
            'model'        : str(drv.get('Model', '')),
            'size'         : int(drv.get('Size', 0)),
            'connection_bus': str(drv.get('ConnectionBus', '')) or '[internal]',
            'serial'       : str(drv.get('Serial', '')),
            'removable'    : bool(drv.get('Removable', False)),
            'ejectable'    : bool(drv.get('Ejectable', False)),
            'can_power_off': bool(drv.get('CanPowerOff', False)),
            'media'        : str(drv.get('Media', '')),
            'media_compatibility': media_compat,
            'time_detected'      : _ts(drv.get('TimeDetected')),
            'time_media_detected': _ts(drv.get('TimeMediaDetected')),
            'block_devices': [],
        }

    for op, ifaces in object_paths.items():
        op_s = str(op)
        if not op_s.startswith('/org/freedesktop/UDisks2/block_devices/'):
            continue
        blk = ifaces.get('org.freedesktop.UDisks2.Block', {})
        fs = ifaces.get('org.freedesktop.UDisks2.Filesystem')  # may be None
        drive_path = str(blk.get('Drive', ''))
        parent = drive_map.get(drive_path)
        if not parent:
            continue

        # Device name from /dev/... or fallback to dbus path tail.
        dev_bytes = blk.get('Device')
        if dev_bytes is not None:
            device = _drives_decode_bytes(dev_bytes)
        else:
            device = op_s.rsplit('/', 1)[-1]

        # UDisks2 Block 'Id' is the stable identifier passed back for mount/unmount.
        block_id = str(blk.get('Id', '') or '')

        mounts = []
        protected_mount = False
        is_partition = ('org.freedesktop.UDisks2.Partition' in ifaces) or bool(blk.get('IdUsage') == 'filesystem')

        if fs:
            for m in fs.get('MountPoints', []):
                mp = _drives_decode_bytes(m)
                mounts.append(mp)
                if mp in _DRIVES_PROTECTED_FS:
                    protected_mount = True

        parent['block_devices'].append({
            'device'    : device,
            'block_id'  : block_id,
            'mounts'    : mounts,
            'label'     : str(blk.get('IdLabel', '') or ''),
            'fstype'    : str(blk.get('IdType', '') or ''),
            'size'      : int(blk.get('Size', 0) or 0),
            'mountable' : fs is not None,
            'protected' : protected_mount,
            'is_partition': is_partition,
        })

    drives = list(drive_map.values())
    # sort: removable/poweroff-capable first, then by id
    drives.sort(key=lambda d: (not d['can_power_off'], d['id']))
    for d in drives:
        d['block_devices'].sort(key=lambda b: b['device'])
    return drives


@bp_api_v2.route('/drives', methods=['GET'])
@jwt_required()
def drives_list():
    try:
        import dbus as _dbus
        bus = _dbus.SystemBus()
        bus.get_object('org.freedesktop.UDisks2', '/org/freedesktop/UDisks2')
        udisks2 = True
    except Exception as e:
        app.logger.error('UDisks2 unavailable: %s', str(e))
        udisks2 = False

    drives = _drives_collect() if udisks2 else []
    return jsonify({
        'udisks2': udisks2,
        'drives' : drives,
        'protected_filesystems': list(_DRIVES_PROTECTED_FS),
    })


def _drives_resolve_device_settings(query_device_id):
    """Locate a (settings_object, object_info) tuple for a Block.Id."""
    import dbus as _dbus
    bus = _dbus.SystemBus()
    udisks_root = bus.get_object('org.freedesktop.UDisks2', '/org/freedesktop/UDisks2')
    iface = _dbus.Interface(udisks_root, 'org.freedesktop.DBus.ObjectManager')
    objects = iface.GetManagedObjects()
    for op, info in objects.items():
        op_s = str(op)
        if not op_s.startswith('/org/freedesktop/UDisks2/block_devices/'):
            continue
        blk = info.get('org.freedesktop.UDisks2.Block', {})
        if str(blk.get('Id', '')) != query_device_id:
            continue
        return bus.get_object('org.freedesktop.UDisks2', op_s), info
    return None, None


@bp_api_v2.route('/drives/action', methods=['POST'])
@jwt_required()
def drives_action():
    """Drive control via UDisks2: mount, unmount, poweroff."""
    from flask_jwt_extended import current_user as jwt_user
    if jwt_user is None or not getattr(jwt_user, 'admin', False):
        return jsonify({'failure-message': 'admin required'}), 403

    import dbus as _dbus
    data = request.get_json(silent=True) or {}
    command = str(data.get('COMMAND', ''))

    if command == 'mount' or command == 'unmount':
        device_id = str(data.get('DEVICE_ID', ''))
        if not device_id:
            return jsonify({'failure-message': 'DEVICE_ID required'}), 400
        settings, info = _drives_resolve_device_settings(device_id)
        if not settings:
            return jsonify({'failure-message': 'Device not found'}), 404
        fs_info = info.get('org.freedesktop.UDisks2.Filesystem')
        if fs_info is None:
            return jsonify({'failure-message': 'Not a filesystem device'}), 400

        mounts = fs_info.get('MountPoints', [])
        if command == 'unmount':
            if not mounts:
                return jsonify({'failure-message': 'Filesystem not mounted'}), 400
            mp0 = _drives_decode_bytes(mounts[0])
            if mp0 in _DRIVES_PROTECTED_FS:
                return jsonify({'failure-message': 'Not allowed to unmount protected filesystem: {0}'.format(mp0)}), 400
            try:
                _dbus.Interface(settings, 'org.freedesktop.UDisks2.Filesystem').Unmount({})
            except _dbus.exceptions.DBusException as e:
                return jsonify({'failure-message': str(e)}), 400
            return jsonify({'success-message': 'Unmount successful'})
        else:  # mount
            if mounts:
                return jsonify({'failure-message': 'Filesystem already mounted'}), 400
            try:
                _dbus.Interface(settings, 'org.freedesktop.UDisks2.Filesystem').Mount({})
            except _dbus.exceptions.DBusException as e:
                return jsonify({'failure-message': str(e)}), 400
            return jsonify({'success-message': 'Mount successful'})

    if command == 'poweroff':
        drive_id = str(data.get('DRIVE_ID', ''))
        if not drive_id:
            return jsonify({'failure-message': 'DRIVE_ID required'}), 400
        bus = _dbus.SystemBus()
        udisks_root = bus.get_object('org.freedesktop.UDisks2', '/org/freedesktop/UDisks2')
        iface = _dbus.Interface(udisks_root, 'org.freedesktop.DBus.ObjectManager')
        for op, info in iface.GetManagedObjects().items():
            op_s = str(op)
            if not op_s.startswith('/org/freedesktop/UDisks2/drives/'):
                continue
            drv = info.get('org.freedesktop.UDisks2.Drive', {})
            if str(drv.get('Id', '')) != drive_id:
                continue
            if not bool(drv.get('CanPowerOff', False)):
                return jsonify({'failure-message': 'Drive cannot be powered off'}), 400
            try:
                _dbus.Interface(bus.get_object('org.freedesktop.UDisks2', op_s), 'org.freedesktop.UDisks2.Drive').PowerOff({})
            except _dbus.exceptions.DBusException as e:
                return jsonify({'failure-message': str(e)}), 400
            return jsonify({'success-message': 'Power off successful'})
        return jsonify({'failure-message': 'Drive not found'}), 404

    return jsonify({'failure-message': 'Unknown command'}), 400


@bp_api_v2.route('/generate/days', methods=['GET'])
@jwt_required()
def generate_days():
    """Distinct days+ToD entries with timelapse/keogram/panorama flags."""
    # meta={'csrf': False} bypasses FlaskForm CSRF; JWT is the auth layer here.
    from .forms import IndiAllskyTimelapseGeneratorForm
    camera_id = int(request.args.get('camera_id', 0))
    if not camera_id:
        return jsonify({'error': 'camera_id required'}), 400
    form = IndiAllskyTimelapseGeneratorForm(
        formdata=None,
        data={'CAMERA_ID': camera_id},
        camera_id=camera_id,
        meta={'csrf': False},
    )
    return jsonify({
        'days': [{'value': v, 'label': l} for v, l in form.DAY_SELECT.choices],
    })


@bp_api_v2.route('/generate/recent-tasks', methods=['GET'])
@jwt_required()
def generate_recent_tasks():
    """Recent VIDEO-queue tasks (last 12h)."""
    from datetime import timedelta
    from .models import (
        IndiAllSkyDbTaskQueueTable, TaskQueueQueue, TaskQueueState,
    )
    from .base_views import BaseView
    from sqlalchemy import and_

    camera_id = int(request.args.get('camera_id', 0))
    if not camera_id:
        return jsonify({'error': 'camera_id required'}), 400
    base = BaseView()
    base.cameraSetup(camera_id=camera_id)

    cutoff = base.camera_now - timedelta(hours=12)
    rows = IndiAllSkyDbTaskQueueTable.query.filter(
        and_(
            IndiAllSkyDbTaskQueueTable.createDate > cutoff,
            IndiAllSkyDbTaskQueueTable.state.in_((
                TaskQueueState.MANUAL, TaskQueueState.QUEUED, TaskQueueState.RUNNING,
                TaskQueueState.SUCCESS, TaskQueueState.FAILED,
            )),
            IndiAllSkyDbTaskQueueTable.queue.in_((TaskQueueQueue.VIDEO,)),
        )
    ).order_by(IndiAllSkyDbTaskQueueTable.createDate.desc())

    tasks = []
    for t in rows:
        data = t.data or {}
        tasks.append({
            'id'         : t.id,
            'createDate' : t.createDate.strftime('%Y-%m-%d %H:%M:%S') if t.createDate else '',
            'queue'      : t.queue.name,
            'action'     : data.get('action', 'MISSING'),
            'state'      : t.state.name,
            'result'     : t.result,
        })
    return jsonify({'tasks': tasks})


_GENERATE_ACTIONS = {
    'generate_video_k_st', 'generate_video', 'generate_k_st', 'generate_panorama_video',
    'delete_video_k_st_p', 'delete_video', 'delete_k_st', 'delete_panorama_video',
    'upload_endofnight', 'delete_images',
}


@bp_api_v2.route('/generate/submit', methods=['POST'])
@jwt_required()
def generate_submit():
    """Queue timelapse/keogram/startrail/panorama generation tasks. Admin-only."""
    from datetime import datetime as _dt
    from sqlalchemy import and_
    from flask_jwt_extended import current_user as jwt_user
    from .models import (
        IndiAllSkyDbCameraTable, IndiAllSkyDbImageTable, IndiAllSkyDbPanoramaImageTable,
        IndiAllSkyDbVideoTable, IndiAllSkyDbKeogramTable, IndiAllSkyDbStarTrailsTable,
        IndiAllSkyDbStarTrailsVideoTable, IndiAllSkyDbPanoramaVideoTable,
        IndiAllSkyDbTaskQueueTable, TaskQueueQueue, TaskQueueState,
    )
    from .base_views import BaseView

    if jwt_user is None or not getattr(jwt_user, 'admin', False):
        return jsonify({'form_global': ['User does not have permission to generate content']}), 403

    data = request.get_json(silent=True) or {}
    try:
        camera_id = int(data['CAMERA_ID'])
    except (KeyError, TypeError, ValueError):
        return jsonify({'form_global': ['camera id required']}), 400

    action = str(data.get('ACTION_SELECT', ''))
    if action not in _GENERATE_ACTIONS:
        return jsonify({'ACTION_SELECT': ['Invalid action']}), 400

    day_select = str(data.get('DAY_SELECT', ''))
    if '_' not in day_select:
        return jsonify({'DAY_SELECT': ['Day required (format YYYY-MM-DD_day|night)']}), 400
    day_str, night_str = day_select.split('_', 1)
    try:
        day_date = _dt.strptime(day_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'DAY_SELECT': ['Invalid date']}), 400
    night = night_str == 'night'

    base = BaseView()
    base.cameraSetup(camera_id=camera_id)
    if not base.verify_admin_network():
        return jsonify({'form_global': ['Request not from admin network']}), 400

    try:
        camera = IndiAllSkyDbCameraTable.query.filter(IndiAllSkyDbCameraTable.id == camera_id).one()
    except Exception:
        return jsonify({'form_global': ['Camera not found']}), 404

    def _delete_for(table):
        entry = table.query.join(table.camera).filter(
            and_(
                IndiAllSkyDbCameraTable.id == camera.id,
                table.dayDate == day_date,
                table.night == night,
            )
        ).first()
        if entry:
            entry.deleteAsset()
            db.session.delete(entry)
            db.session.commit()
        return entry is not None

    def _enqueue(jobaction):
        task = IndiAllSkyDbTaskQueueTable(
            queue=TaskQueueQueue.VIDEO,
            state=TaskQueueState.MANUAL,
            priority=100,
            data={
                'action': jobaction,
                'kwargs': {
                    'timespec' : day_date.strftime('%Y%m%d'),
                    'night'    : night,
                    'camera_id': camera.id,
                },
            },
        )
        db.session.add(task)

    fish2pano = bool((base.indi_allsky_config.get('FISH2PANO', {}) or {}).get('ENABLE'))

    if action == 'delete_video_k_st_p':
        _delete_for(IndiAllSkyDbVideoTable)
        _delete_for(IndiAllSkyDbKeogramTable)
        _delete_for(IndiAllSkyDbStarTrailsTable)
        _delete_for(IndiAllSkyDbStarTrailsVideoTable)
        _delete_for(IndiAllSkyDbPanoramaVideoTable)
        return jsonify({'success-message': 'Files deleted'})

    if action == 'delete_video':
        _delete_for(IndiAllSkyDbVideoTable)
        return jsonify({'success-message': 'Timelapse deleted'})

    if action == 'delete_panorama_video':
        _delete_for(IndiAllSkyDbPanoramaVideoTable)
        return jsonify({'success-message': 'Panorama Timelapse deleted'})

    if action == 'delete_k_st':
        _delete_for(IndiAllSkyDbKeogramTable)
        _delete_for(IndiAllSkyDbStarTrailsTable)
        _delete_for(IndiAllSkyDbStarTrailsVideoTable)
        return jsonify({'success-message': 'Keogram/Star Trails deleted'})

    if action == 'generate_video_k_st':
        _enqueue('generateKeogramStarTrails')
        _enqueue('generateVideo')
        if fish2pano:
            _enqueue('generatePanoramaVideo')
        db.session.commit()
        return jsonify({'success-message': 'Job submitted'})

    if action == 'generate_video':
        _enqueue('generateVideo')
        db.session.commit()
        return jsonify({'success-message': 'Job submitted'})

    if action == 'generate_panorama_video':
        if not fish2pano:
            return jsonify({'success-message': 'Panoramas disabled'})
        _enqueue('generatePanoramaVideo')
        db.session.commit()
        return jsonify({'success-message': 'Job submitted'})

    if action == 'generate_k_st':
        _enqueue('generateKeogramStarTrails')
        db.session.commit()
        return jsonify({'success-message': 'Job submitted'})

    if action == 'upload_endofnight':
        task = IndiAllSkyDbTaskQueueTable(
            queue=TaskQueueQueue.VIDEO,
            state=TaskQueueState.MANUAL,
            priority=100,
            data={
                'action': 'uploadAllskyEndOfNight',
                'kwargs': {'night': True, 'camera_id': camera.id},
            },
        )
        db.session.add(task)
        db.session.commit()
        return jsonify({'success-message': 'Job submitted'})

    if action == 'delete_images':
        image_ids = [r.id for r in IndiAllSkyDbImageTable.query
                     .join(IndiAllSkyDbImageTable.camera)
                     .filter(and_(
                         IndiAllSkyDbCameraTable.id == camera.id,
                         IndiAllSkyDbImageTable.dayDate == day_date,
                         IndiAllSkyDbImageTable.night == night,
                     )).order_by(IndiAllSkyDbImageTable.createDate.asc())]
        pano_ids = [r.id for r in IndiAllSkyDbPanoramaImageTable.query
                    .join(IndiAllSkyDbPanoramaImageTable.camera)
                    .filter(and_(
                        IndiAllSkyDbCameraTable.id == camera.id,
                        IndiAllSkyDbPanoramaImageTable.dayDate == day_date,
                        IndiAllSkyDbPanoramaImageTable.night == night,
                    )).order_by(IndiAllSkyDbPanoramaImageTable.createDate.asc())]

        def _bulk_delete(table, ids):
            n = 0
            for eid in ids:
                entry = table.query.filter(table.id == eid).one()
                try:
                    entry.deleteAsset()
                except OSError as e:
                    app.logger.error('Cannot remove file: %s', str(e))
                    continue
                db.session.delete(entry)
                db.session.commit()
                n += 1
            return n

        count = _bulk_delete(IndiAllSkyDbImageTable, image_ids)
        count += _bulk_delete(IndiAllSkyDbPanoramaImageTable, pano_ids)
        return jsonify({'success-message': '{0:d} images deleted'.format(count)})

    return jsonify({'form_global': ['Invalid']}), 400


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


@bp_api_v2.route('/users', methods=['GET'])
@jwt_required()
def users_list():
    rows = IndiAllSkyDbUserTable.query\
        .order_by(IndiAllSkyDbUserTable.createDate.asc())\
        .all()
    return jsonify([
        {
            'id'         : u.id,
            'username'   : u.username,
            'name'       : u.name,
            'email'      : u.email,
            'createDate' : u.createDate.isoformat() if u.createDate else None,
            'active'     : bool(u.active),
            'staff'      : bool(u.staff),
            'admin'      : bool(u.admin),
        }
        for u in rows
    ])


def _camera_admin_dto(c):
    return {
        'id'           : c.id,
        'name'         : c.name,
        'friendlyName' : c.friendlyName,
        'hidden'       : bool(c.hidden),
        'connectDate'  : c.connectDate.isoformat() if c.connectDate else None,
        'width'        : int(c.width or 0),
        'height'       : int(c.height or 0),
        'pixelSize'    : float(c.pixelSize or 0),
        'bits'         : int(c.bits or 0),
        'minGain'      : float(c.minGain or 0),
        'maxGain'      : float(c.maxGain or 0),
        'minBinning'   : c.minBinning,
        'maxBinning'   : c.maxBinning,
        'minExposure'  : float(c.minExposure or 0),
        'maxExposure'  : float(c.maxExposure or 0),
    }


@bp_api_v2.route('/cameras-list', methods=['GET'])
@jwt_required()
def cameras_admin_list():
    rows = IndiAllSkyDbCameraTable.query\
        .order_by(IndiAllSkyDbCameraTable.id.desc())\
        .all()
    return jsonify([_camera_admin_dto(c) for c in rows])


@bp_api_v2.route('/cameras-list/<int:camera_id>', methods=['PATCH'])
@jwt_required()
def cameras_admin_update(camera_id):
    from sqlalchemy.orm.exc import NoResultFound
    from flask_jwt_extended import current_user as jwt_user
    if jwt_user is None or not getattr(jwt_user, 'admin', False):
        return jsonify({'failure-message': 'admin required'}), 403

    data = request.get_json(silent=True) or {}
    try:
        cam = IndiAllSkyDbCameraTable.query\
            .filter(IndiAllSkyDbCameraTable.id == camera_id).one()
    except NoResultFound:
        return jsonify({'failure-message': 'Camera not found'}), 404

    if 'friendlyName' in data:
        v = data['friendlyName']
        if v is not None and not isinstance(v, str):
            return jsonify({'failure-message': 'friendlyName must be string or null'}), 400
        if isinstance(v, str):
            v = v.strip()
            if len(v) > 100:
                return jsonify({'failure-message': 'friendlyName too long (max 100)'}), 400
            v = v or None
        cam.friendlyName = v

    if 'hidden' in data:
        cam.hidden = bool(data['hidden'])

    db.session.commit()
    return jsonify(_camera_admin_dto(cam))


@bp_api_v2.route('/notifications/history', methods=['GET'])
@jwt_required()
def notifications_history():
    from .models import IndiAllSkyDbNotificationTable
    notices = IndiAllSkyDbNotificationTable.query\
        .order_by(IndiAllSkyDbNotificationTable.createDate.desc())\
        .limit(50)\
        .all()
    return jsonify([
        {
            'id'           : n.id,
            'createDate'   : n.createDate.isoformat() if n.createDate else None,
            'expireDate'   : n.expireDate.isoformat() if n.expireDate else None,
            'category'     : n.category.value,
            'ack'          : bool(n.ack),
            'notification' : n.notification,
        }
        for n in notices
    ])


@bp_api_v2.route('/tasks', methods=['GET'])
@jwt_required()
def tasks_list():
    from datetime import timedelta
    from sqlalchemy import and_ as _and
    from .models import (
        IndiAllSkyDbTaskQueueTable,
        TaskQueueState,
        TaskQueueQueue,
    )

    state_list = (
        TaskQueueState.MANUAL,
        TaskQueueState.QUEUED,
        TaskQueueState.RUNNING,
        TaskQueueState.SUCCESS,
        TaskQueueState.FAILED,
    )
    exclude_queues = (TaskQueueQueue.IMAGE, TaskQueueQueue.UPLOAD)

    now_minus_3d = datetime.now() - timedelta(days=3)
    tasks = IndiAllSkyDbTaskQueueTable.query\
        .filter(
            _and(
                IndiAllSkyDbTaskQueueTable.createDate > now_minus_3d,
                IndiAllSkyDbTaskQueueTable.state.in_(state_list),
                ~IndiAllSkyDbTaskQueueTable.queue.in_(exclude_queues),
            )
        )\
        .order_by(IndiAllSkyDbTaskQueueTable.createDate.desc())\
        .all()

    return jsonify([
        {
            'id'         : t.id,
            'createDate' : t.createDate.isoformat() if t.createDate else None,
            'queue'      : t.queue.name,
            'state'      : t.state.name,
            'action'     : (t.data or {}).get('action', 'MISSING'),
            'result'     : t.result,
        }
        for t in tasks
    ])


@bp_api_v2.route('/config-history', methods=['GET'])
@jwt_required()
def config_history():
    # OUTER JOIN: keep configs whose owner row was deleted (username = None).
    from .models import IndiAllSkyDbConfigTable
    rows = db.session.query(
            IndiAllSkyDbConfigTable.id,
            IndiAllSkyDbConfigTable.createDate,
            IndiAllSkyDbConfigTable.level,
            IndiAllSkyDbConfigTable.note,
            IndiAllSkyDbConfigTable.encrypted,
            IndiAllSkyDbUserTable.username,
        )\
        .outerjoin(
            IndiAllSkyDbUserTable,
            IndiAllSkyDbConfigTable.user_id == IndiAllSkyDbUserTable.id,
        )\
        .order_by(IndiAllSkyDbConfigTable.createDate.desc())\
        .limit(25)\
        .all()
    return jsonify([
        {
            'id'         : r.id,
            'createDate' : r.createDate.isoformat() if r.createDate else None,
            'level'      : r.level,
            'note'       : r.note,
            'encrypted'  : bool(r.encrypted),
            'username'   : r.username,
        }
        for r in rows
    ])


@bp_api_v2.route('/config-download/<int:config_id>', methods=['GET'])
@jwt_required()
def config_download(config_id):
    """Stream a config snapshot as a JSON file download."""
    from .views import ConfigDownloadView
    from .models import IndiAllSkyDbConfigTable
    import io
    import json as _json
    from flask import send_file

    redact = bool(int(request.args.get('redact', 0)))
    config_entry = IndiAllSkyDbConfigTable.query\
        .filter(IndiAllSkyDbConfigTable.id == config_id)\
        .one()

    config = dict(config_entry.data)
    if redact:
        view = ConfigDownloadView()
        config = view.dict_merge(config, view.redact_dict)
        if 'LOCATION_LATITUDE' in config:
            config['LOCATION_LATITUDE'] = float(round(config['LOCATION_LATITUDE']))
        if 'LOCATION_LONGITUDE' in config:
            config['LOCATION_LONGITUDE'] = float(round(config['LOCATION_LONGITUDE']))

    buf = io.BytesIO(_json.dumps(config, indent=4, ensure_ascii=False).encode())
    name = 'indi-allsky_config_id-{0:d}_level-{1:s}_{2:%Y%m%d_%H%M%S}.json'.format(
        config_entry.id,
        config_entry.level.replace('.', '-'),
        datetime.now(),
    )
    return send_file(buf, mimetype='application/octet-stream', download_name=name, as_attachment=True)


@bp_api_v2.route('/config-restore', methods=['POST'])
@jwt_required()
def config_restore():
    """Restore config from an uploaded JSON file. Admin-only."""
    import io
    import json as _json
    import tempfile
    from collections import OrderedDict
    from pathlib import Path

    from flask_jwt_extended import current_user as jwt_user
    if jwt_user is None or not getattr(jwt_user, 'admin', False):
        return jsonify({'form_global': ['admin required']}), 403

    upload = request.files.get('CONFIG_UPLOAD')
    if upload is None or not upload.filename:
        return jsonify({
            'form_global': ['Please fix the errors above'],
            'CONFIG_UPLOAD': ['File required'],
        }), 400

    flush_configs = _truthy_form(request.form.get('FLUSH_CONFIGS'))
    reset_keys    = _truthy_form(request.form.get('RESET_KEYS'))

    f_tmp = tempfile.NamedTemporaryFile(mode='wb', delete=False, suffix='.json')
    f_tmp.close()
    tmp_p = Path(f_tmp.name)
    upload.save(str(tmp_p))

    try:
        size = tmp_p.stat().st_size
        if size == 0:
            return jsonify({'form_global': ['Please fix the errors above'], 'CONFIG_UPLOAD': ['File is empty']}), 400
        if size > 100000:
            return jsonify({'form_global': ['Please fix the errors above'], 'CONFIG_UPLOAD': ['File too large']}), 400

        try:
            with io.open(str(tmp_p), 'rb') as f:
                config_dict = _json.load(f, object_pairs_hook=OrderedDict)
        except ValueError:
            return jsonify({'form_global': ['Please fix the errors above'], 'CONFIG_UPLOAD': ['Invalid JSON']}), 400
    finally:
        try:
            tmp_p.unlink()
        except FileNotFoundError:
            pass

    if (
        not isinstance(config_dict.get('INDI_SERVER'), str)
        or not isinstance(config_dict.get('CCD_CONFIG'), dict)
        or not isinstance(config_dict.get('INDI_CONFIG_DEFAULTS'), dict)
    ):
        return jsonify({'form_global': ['Please fix the errors above'], 'CONFIG_UPLOAD': ['Not a valid indi-allsky config']}), 400

    from ..config import IndiAllSkyConfig
    from ..exceptions import ConfigSaveException
    cfg_obj = IndiAllSkyConfig()
    username = jwt_user.username if jwt_user is not None else 'system'

    try:
        cfg_obj.config = config_dict
        cfg_obj.save(username, 'Manual config restore from upload')
    except ConfigSaveException as e:
        return jsonify({'form_global': ['Please fix the errors above'], 'CONFIG_UPLOAD': [str(e)]}), 400

    app.logger.info('Restored config from upload (api/v2)')

    if flush_configs:
        from .models import IndiAllSkyDbConfigTable
        IndiAllSkyDbConfigTable.query\
            .filter(IndiAllSkyDbConfigTable.id != cfg_obj.config_id)\
            .delete()
        db.session.commit()
        app.logger.warning('Config entries flushed')

    if reset_keys:
        import shutil
        import secrets
        from cryptography.fernet import Fernet

        flask_config_p = Path('/etc/indi-allsky/flask.json')
        with io.open(str(flask_config_p), 'rb') as fc_f:
            flask_config = _json.load(fc_f, object_pairs_hook=OrderedDict)

        flask_config['SECRET_KEY']   = secrets.token_hex()
        flask_config['PASSWORD_KEY'] = Fernet.generate_key().decode()

        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json', encoding='utf-8') as f_tmp_c:
            _json.dump(flask_config, f_tmp_c, indent=2, ensure_ascii=False)
            tmp_fc_p = Path(f_tmp_c.name)

        shutil.copy2(str(tmp_fc_p), str(flask_config_p))
        tmp_fc_p.unlink()
        flask_config_p.chmod(0o660)

        app.logger.warning('Reset security keys')

    return jsonify({'success-message': 'Restored Config'})


def _truthy_form(v):
    if v is None:
        return False
    s = str(v).strip().lower()
    return s not in ('', '0', 'false', 'no', 'off')


@bp_api_v2.route('/config', methods=['GET'])
@jwt_required()
def config_get():
    """Return the current config as a nested dict, plus camera limits used to
    constrain range-bound fields (gain, binning, exposure)."""
    from ..config import IndiAllSkyConfig
    cfg_obj = IndiAllSkyConfig()

    camera_id = request.args.get('camera_id')
    cam = None
    if camera_id:
        try:
            cam = IndiAllSkyDbCameraTable.query\
                .filter(IndiAllSkyDbCameraTable.id == int(camera_id)).first()
        except (TypeError, ValueError):
            cam = None
    if cam is None:
        cam = IndiAllSkyDbCameraTable.query\
            .order_by(IndiAllSkyDbCameraTable.id.asc()).first()

    cam_ctx = None
    if cam is not None:
        max_exp = float(cam.maxExposure or 0)
        cam_ctx = {
            'id'           : cam.id,
            'name'         : cam.name,
            'minGain'      : float(cam.minGain or 0),
            'maxGain'      : float(cam.maxGain or 0),
            'minBinning'   : cam.minBinning,
            'maxBinning'   : cam.maxBinning,
            'minExposure'  : float(cam.minExposure or 0),
            'maxExposure'  : 120 if max_exp > 120 else max_exp,
        }

    return jsonify({
        'config'    : cfg_obj.config,
        'config_id' : cfg_obj.config_id,
        'camera'    : cam_ctx,
    })


@bp_api_v2.route('/config', methods=['POST'])
@jwt_required()
def config_save():
    """Replace the current config with the posted nested dict. Admin-only.
    Body: { config: {...}, note?: "..." }
    """
    from flask_jwt_extended import current_user as jwt_user
    if jwt_user is None or not getattr(jwt_user, 'admin', False):
        return jsonify({'form_global': ['admin required']}), 403

    body = request.get_json(silent=True) or {}
    new_config = body.get('config')
    note = str(body.get('note') or 'Saved via web UI')

    if not isinstance(new_config, dict):
        return jsonify({'form_global': ['config must be an object']}), 400

    # Same shape sanity check as Config Restore
    if (
        not isinstance(new_config.get('INDI_SERVER'), str)
        or not isinstance(new_config.get('CCD_CONFIG'), dict)
        or not isinstance(new_config.get('INDI_CONFIG_DEFAULTS'), dict)
    ):
        return jsonify({'form_global': ['Config is missing required keys']}), 400

    from ..config import IndiAllSkyConfig
    from ..exceptions import ConfigSaveException
    cfg_obj = IndiAllSkyConfig()
    username = jwt_user.username if jwt_user is not None else 'system'

    try:
        cfg_obj.config = new_config
        entry = cfg_obj.save(username, note)
    except ConfigSaveException as e:
        return jsonify({'form_global': [str(e)]}), 400

    return jsonify({
        'success-message': 'Config saved',
        'config_id': entry.id,
    })
