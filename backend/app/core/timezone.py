from datetime import datetime
import pytz

# Philippine timezone
PHILIPPINE_TZ = pytz.timezone('Asia/Manila')


def get_philippine_time():
    """Get current time in Philippine timezone"""
    return datetime.now(PHILIPPINE_TZ)


def get_philippine_time_naive():
    """Get current time in Philippine timezone as naive datetime (without timezone info)"""
    return datetime.now(PHILIPPINE_TZ).replace(tzinfo=None)
