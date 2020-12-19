
import unittest
from ..components.proxy.RewriteProxy import RewriteProxy


class TestRewriteProxy(unittest.TestCase):
    def test_canonicalize_url(self):
        self.assertEqual(
            RewriteProxy.canonicalizeUrl("http://kros1.kwola.io/components/navbar/navbar.html"),
            "http://kros1.kwola.io/components/navbar/navbar.html"
        )

        self.assertEqual(
            RewriteProxy.canonicalizeUrl("https://gwl-demo.purewealth.cloud/Content/js/optimized/Login-default--en_ca-gwl-demo-29B8FA5E1203D3BFAEBA04B6EC29D1949F3D63F4.js"),
            "https://gwl-demo.purewealth.cloud/Content/js/optimized/Login-default--en_ca-gwl-demo-[<HEXID>].js"
        )
