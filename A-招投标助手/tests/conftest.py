import os
import tempfile


os.environ["BID_RUNTIME"] = tempfile.mkdtemp(prefix="weihua-bid-test-")

