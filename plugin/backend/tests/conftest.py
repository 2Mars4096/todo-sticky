import os
import sys
from pathlib import Path
host=os.environ.get('DIANE_HOST_SOURCE','/private/tmp/diane-unified-workspace-20261113/todo-editor')
sys.path.insert(0,str(Path(host)/'src'))
import diane.plugins
diane.plugins.__path__.insert(0,str(Path(__file__).resolve().parents[1]/'src/diane/plugins'))
