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
