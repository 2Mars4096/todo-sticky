import os
import sys
from pathlib import Path

host_source = os.environ.get('DIANE_HOST_SOURCE')
if host_source:
    sys.path.insert(0, str(Path(host_source) / 'src'))

import diane.plugins

diane.plugins.__path__.insert(0, str(Path(__file__).resolve().parents[1] / 'src/diane/plugins'))
