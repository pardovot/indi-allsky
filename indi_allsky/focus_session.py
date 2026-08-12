"""
Live focus session state.

The session document is stored as JSON in the state table, which is the only
storage both the web process and the capture worker can reach.  It lets the web
interface change capture parameters without writing the configuration file or
restarting any workers.

A session carries an expiration timestamp that the web interface refreshes while
the focus page is open.  A closed browser tab therefore returns the camera to
normal capture on its own instead of leaving it stuck in focus mode.
"""

import json
import time
import logging


logger = logging.getLogger('indi_allsky')


STATE_KEY = 'FOCUS_SESSION'

# how long a session survives without the focus page refreshing it
DEFAULT_TTL = 90.0
MAX_TTL = 900.0

# seconds between focus frames
MIN_INTERVAL = 0.5
MAX_INTERVAL = 60.0
DEFAULT_INTERVAL = 2.0


def encode(session):
    return json.dumps(session)


def decode(raw, now=None):
    """
    Parse a stored session document.  Returns None when the session is absent,
    malformed, switched off, or expired.
    """
    if not raw:
        return None


    try:
        session = json.loads(raw)
    except (ValueError, TypeError):
        logger.error('Malformed focus session state')
        return None


    if not isinstance(session, dict):
        logger.error('Focus session state is not an object')
        return None


    if not session.get('active'):
        return None


    if isinstance(now, type(None)):
        now = time.time()


    try:
        expires = float(session['expires'])
    except (KeyError, TypeError, ValueError):
        logger.error('Focus session missing a valid expiration')
        return None


    if expires < now:
        return None


    return session


def build(camera_id, exposure, gain, binning, interval, ttl=DEFAULT_TTL, now=None):
    if isinstance(now, type(None)):
        now = time.time()


    return {
        'active'    : True,
        'camera_id' : int(camera_id),
        'exposure'  : float(exposure),
        'gain'      : float(gain),
        'binning'   : int(binning),
        'interval'  : clamp(float(interval), MIN_INTERVAL, MAX_INTERVAL),
        'expires'   : float(now) + clamp(float(ttl), 0.0, MAX_TTL),
    }


def clamp(value, lower, upper):
    if upper < lower:
        # a camera reporting an inverted range would otherwise raise
        return lower

    return max(lower, min(upper, value))
