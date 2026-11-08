"""How far is an extracted layer shifted from its master? align.py master.png layer.png [layer2 ...]"""
import sys
sys.path.insert(0, __file__.rsplit("/", 1)[0])
import numpy as np
from paper import load, key_magenta
from skimage.registration import phase_cross_correlation
def offset(master, layer):
    m = load(master); a = load(layer, size=(m.shape[1], m.shape[0]))
    al = key_magenta(a)[..., 3] / 255
    mask = al > .9
    gm = m.mean(-1); ga = a.mean(-1)
    sh, err, _ = phase_cross_correlation(gm, ga, reference_mask=mask, moving_mask=mask)
    # residual difference under the mask, before and after
    d0 = np.abs(gm - ga)[mask].mean()
    return sh, d0
if __name__ == "__main__":
    for f in sys.argv[2:]:
        sh, d0 = offset(sys.argv[1], f)
        print(f, "shift (dy,dx) =", np.round(sh, 2), "mean diff", round(float(d0), 1))
