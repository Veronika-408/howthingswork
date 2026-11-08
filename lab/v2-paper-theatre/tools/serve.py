"""A quieter static server for this variant's own checks (a bigger listen queue than python -m http.server):
   /usr/bin/python3 lab/v2-paper-theatre/tools/serve.py 8767   (serves lab/)"""
import functools, http.server, os, sys
class S(http.server.ThreadingHTTPServer):
    request_queue_size = 128
    daemon_threads = True
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
S(("127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8767), functools.partial(H, directory=root)).serve_forever()
