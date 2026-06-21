# cloud/tests/test_cli.py
import os, sys, subprocess
def test_cli_runs_and_produces_chart(tmp_path):
    repo = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))  # cloud/
    out = str(tmp_path / 'out')
    py = os.path.join(repo, '.venv', 'Scripts', 'python.exe')
    env = dict(os.environ, PYTHONIOENCODING='utf-8', PYTHONUTF8='1')
    r = subprocess.run([py, '-m', 'kyro_harness', '--bundle',
                        os.path.join(repo, 'bundles', 'edh-core-v0-mock.kyro'), '--out', out],
                       cwd=repo, env=env, capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    assert os.path.exists(os.path.join(out, 'collapse.png'))
