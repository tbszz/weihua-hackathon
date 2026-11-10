# 卫华起重机「零件穿梭」复刻：按参考视频（refs/参考视频.mp4）的时间点逐帧合成 1080x1920 / 30fps 成片。
# 用法：python render.py [--preview] [--from 0 --to 12.23]
import argparse, math, subprocess, sys
from pathlib import Path
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent
SHOTS = ROOT / 'shots'
W, H, FPS = 1080, 1920, 30
DUR = 367 / FPS  # 与参考视频同长 12.233s

# ---------- 素材 ----------
_cache = {}

def chroma(img):
    """纯绿底抠像，返回 RGBA（float32 0-1）。"""
    f = img.astype(np.float32)
    b, g, r = f[..., 0], f[..., 1], f[..., 2]
    spill = g - np.maximum(r, b)
    a = np.clip(1 - (spill - 35) / 55, 0, 1)
    a = cv2.erode(a, np.ones((3, 3), np.uint8))
    a = cv2.GaussianBlur(a, (3, 3), 0)
    f[..., 1] = np.where(a < 0.999, np.minimum(g, np.maximum(r, b) + 8), g)  # 去绿边
    return np.dstack([f / 255, a])

def load(name, key=False):
    k = (name, key)
    if k not in _cache:
        img = cv2.imread(str(SHOTS / f'{name}.png'), cv2.IMREAD_COLOR)
        if img is None:
            raise FileNotFoundError(name)
        _cache[k] = chroma(img) if key else np.dstack([img.astype(np.float32) / 255, np.ones(img.shape[:2], np.float32)])
    return _cache[k]

# ---------- 运动工具 ----------
def clamp01(x):
    return max(0.0, min(1.0, x))

def ease(t, t0, t1, v0, v1, kind='io'):
    p = clamp01((t - t0) / (t1 - t0)) if t1 > t0 else float(t >= t1)
    if kind == 'io':
        p = p * p * (3 - 2 * p)
    elif kind == 'in':
        p = p ** 3
    elif kind == 'out':
        p = 1 - (1 - p) ** 3
    return v0 + (v1 - v0) * p

def keys(t, pts, kind='io'):
    """分段关键帧 [(t, v), ...]"""
    if t <= pts[0][0]:
        return pts[0][1]
    for (a, va), (b, vb) in zip(pts, pts[1:]):
        if t <= b:
            if isinstance(va, tuple):
                return tuple(ease(t, a, b, x, y, kind) for x, y in zip(va, vb))
            return ease(t, a, b, va, vb, kind)
    return pts[-1][1]

def shake(t, seed, amp=7.0, rot=0.35):
    """手机手持的低频抖动。"""
    def n(f, ph):
        return math.sin(t * f + ph) * 0.6 + math.sin(t * f * 2.13 + ph * 1.7) * 0.3 + math.sin(t * f * 4.7 + ph * 0.3) * 0.1
    return amp * n(2.1, seed), amp * n(1.7, seed + 3.1), rot * n(1.3, seed + 5.2)

def matrix(img, zoom=1.0, u=0.5, v=0.5, x=0.5, y=0.5, rot=0.0, dx=0.0, dy=0.0):
    """源图点 (u,v)（归一化）映射到画面点 (x,y)（归一化）；zoom=1 时恰好铺满 9:16 画面。"""
    h, w = img.shape[:2]
    s = max(W / w, H / h) * zoom
    c, sn = math.cos(math.radians(rot)) * s, math.sin(math.radians(rot)) * s
    sx, sy = u * w, v * h
    ox, oy = x * W + dx, y * H + dy
    return np.array([[c, -sn, ox - (c * sx - sn * sy)], [sn, c, oy - (sn * sx + c * sy)]], np.float32)

def warp(img, M):
    return cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))

def over(dst, src, alpha=1.0):
    a = src[..., 3:4] * alpha
    dst[..., :3] = src[..., :3] * a + dst[..., :3] * (1 - a)
    return dst

def layer(canvas, name, key=False, alpha=1.0, seed=0, amp=7.0, **kw):
    img = load(name, key)
    sx, sy, sr = shake(kw.pop('st', 0.0), seed, amp)
    kw['dx'] = kw.get('dx', 0.0) + sx
    kw['dy'] = kw.get('dy', 0.0) + sy
    kw['rot'] = kw.get('rot', 0.0) + sr
    return over(canvas, warp(img, matrix(img, **kw)), alpha)

def full(t, name, seed=0, **kw):
    c = np.zeros((H, W, 4), np.float32)
    return layer(c, name, seed=seed, st=t, **kw)

def circle_mask(M, cu, cv, r, img_shape, feather=3.0):
    """源图里的圆 (cu,cv,r 归一化到宽度) 变换到画面后的遮罩。"""
    h, w = img_shape[:2]
    p = M @ np.array([cu * w, cv * h, 1.0])
    s = math.hypot(M[0, 0], M[1, 0])
    R = r * w * s
    yy, xx = np.ogrid[:H, :W]
    d = np.sqrt((xx - p[0]) ** 2 + (yy - p[1]) ** 2)
    return np.clip((R - d) / feather + 0.5, 0, 1).astype(np.float32)

# ---------- 镜头表（时间与参考视频逐段对齐） ----------
def frame(t):
    c = np.zeros((H, W, 4), np.float32)
    c[..., 3] = 1

    # ===== 段 1：0–6.07 图层叠加段 =====
    if t < 6.067:
        # 背景机位
        if t < 0.30:
            layer(c, 'W1', seed=1, st=t, zoom=keys(t, [(0, 1.0), (0.3, 1.05)]), u=0.52, v=0.62, x=0.5, y=0.6)
        elif t < 1.40:
            layer(c, 'W2', seed=2, st=t, zoom=keys(t, [(0.3, 1.0), (1.4, 1.07)]), u=0.5, v=0.62, x=0.5, y=keys(t, [(0.3, 0.66), (1.4, 0.62)]))
        elif t < 3.0:
            z = keys(t, [(1.4, 1.0), (3.0, 1.1)])
            layer(c, 'W3', seed=3, st=t, zoom=z, u=0.5, v=0.6, x=keys(t, [(1.4, 0.46), (3.0, 0.54)]), y=0.6)
            if t < 1.53:  # 背景机位短叠化
                layer(c, 'W2', seed=2, st=t, alpha=1 - (t - 1.4) / 0.13, zoom=1.07, u=0.5, v=0.62, x=0.5, y=0.62)
        elif t < 4.4:
            layer(c, 'W1', seed=4, st=t, zoom=keys(t, [(3.0, 1.35), (4.4, 1.5)]), u=0.55, v=0.6, x=0.5, y=keys(t, [(3.0, 0.62), (4.4, 0.58)]))
        else:
            layer(c, 'W1', seed=5, st=t, zoom=keys(t, [(4.4, 1.2), (6.0, 1.32)]), u=0.6, v=0.66, x=keys(t, [(4.4, 0.42), (6.0, 0.5)]), y=0.66, rot=-3)

        # 前景零件 B：主梁底面电气箱，从上滑入（0.17–0.33），2.0–2.2 向上滑出
        if 0.17 <= t < 2.25:
            dy = keys(t, [(0.17, -0.55), (0.33, 0.0), (1.95, -0.04), (2.25, -0.6)], 'out') * H
            layer(c, 'FG_B', key=True, seed=11, st=t, zoom=keys(t, [(0.17, 1.15), (0.4, 1.0), (1.95, 1.08)]), u=0.5, v=0.3, x=0.5, y=0.3, dy=dy, rot=keys(t, [(0.17, -6), (0.4, 0), (2.0, 2)]))
        # 前景零件 C：操作手柄，从右下升起
        if 1.45 <= t < 4.0:
            dy = keys(t, [(1.45, 0.55), (2.3, 0.05), (2.9, 0.0), (3.05, 0.28), (3.85, 0.3), (4.0, 0.6)]) * H
            dx = keys(t, [(1.45, 0.25), (2.3, 0.0)]) * W
            z = keys(t, [(1.45, 0.95), (2.3, 1.05), (2.85, 1.15), (3.05, 0.95)])
            layer(c, 'FG_C', key=True, seed=12, st=t, zoom=z, u=0.5, v=0.75, x=0.5, y=0.75, dx=dx, dy=dy, rot=keys(t, [(1.45, 10), (2.3, 2), (3.0, -2)]))
        # 前景零件 D：电动葫芦，从上方挂下
        if 2.8 <= t < 6.067:
            dy = keys(t, [(2.8, -0.5), (3.0, -0.08), (4.35, 0.03), (4.6, -0.06), (6.0, -0.04)]) * H
            z = keys(t, [(2.8, 0.9), (3.0, 0.95), (4.35, 1.3), (4.6, 1.05), (6.0, 1.12)])
            layer(c, 'FG_D', key=True, seed=13, st=t, zoom=z, u=0.5, v=0.25, x=0.5, y=0.25, dy=dy)
        # 前景零件 E：吊钩组，从右下进入
        if 4.4 <= t < 6.067:
            dx = keys(t, [(4.4, 0.6), (5.0, 0.0), (6.0, -0.03)], 'out') * W
            dy = keys(t, [(4.4, 0.35), (5.0, 0.0)], 'out') * H
            layer(c, 'FG_E', key=True, seed=14, st=t, zoom=keys(t, [(4.4, 0.95), (6.0, 1.1)]), u=0.75, v=0.8, x=0.75, y=0.8, dx=dx, dy=dy)
        return c

    # ===== 段 2：6.07–6.8 侧后方全景 =====
    if t < 6.8:
        return layer(c, 'F1', seed=6, st=t, zoom=keys(t, [(6.067, 1.0), (6.8, 1.06)]), u=0.5, v=0.6, x=0.5, y=0.6)

    # ===== 段 3：6.8–8.1 穿孔：葫芦风罩圆孔 → 吊钩钩口 =====
    G_CIRCLE = CIRCLES.get('G', (0.5, 0.5, 0.27))
    if t < 7.65:
        g = load('G')
        gz = keys(t, [(6.8, 4.2), (7.0, 1.0), (7.65, 1.12)], 'out')
        sx, sy, sr = shake(t, 7)
        Mg = matrix(g, zoom=gz, u=G_CIRCLE[0], v=G_CIRCLE[1], x=0.5, y=0.5, dx=sx, dy=sy, rot=sr)
        inner = keys(t, [(6.8, 0.0), (7.3, 0.0), (7.42, 1.0)], 'io')  # 圆孔内容由 F1 叠化成风罩本身
        layer(c, 'F1', seed=6, st=t, zoom=keys(t, [(6.8, 1.06), (7.3, 0.9)]), u=0.5, v=0.6, x=0.5, y=0.58)
        gl = warp(g, Mg)
        m = circle_mask(Mg, *G_CIRCLE, g.shape)
        gl[..., 3] *= 1 - m * (1 - inner)
        c = over(c, gl)
        if t >= 7.55:  # 吊钩钩口从画外拉出，框住葫芦
            hz = keys(t, [(7.55, 5.0), (7.65, 3.0)], 'out')
            c = hook(c, t, hz)
        return c
    if t < 8.1:
        hz = keys(t, [(7.65, 3.0), (7.95, 1.0), (8.1, 3.2)], 'io')
        if t < 7.97:  # 钩口里还是葫芦风罩
            layer(c, 'G', seed=7, st=t, zoom=keys(t, [(7.65, 1.12), (7.95, 0.85)]), u=G_CIRCLE[0], v=G_CIRCLE[1], x=0.5, y=0.5)
        else:  # 钩口里换成行走车轮，然后穿过钩口
            layer(c, 'I', seed=8, st=t, zoom=keys(t, [(7.97, 0.8), (8.1, 1.0)]), u=0.5, v=0.6, x=0.5, y=0.6)
        return hook(c, t, hz)

    # ===== 段 4：8.1–8.9 贴地车轮 → 再穿钩口 =====
    if t < 8.9:
        if t < 8.78:
            layer(c, 'I', seed=8, st=t, zoom=keys(t, [(8.1, 1.0), (8.78, 1.1)]), u=0.5, v=0.6, x=0.5, y=0.6)
        else:
            layer(c, 'J', seed=9, st=t, zoom=keys(t, [(8.78, 0.8), (8.9, 1.0)]), u=0.5, v=0.55, x=0.5, y=0.55)
        if t >= 8.55:
            c = hook(c, t, keys(t, [(8.55, 4.0), (8.78, 1.0), (8.9, 3.4)], 'io'))
        return c

    # ===== 段 5：8.9–9.6 主梁字样侧面，推进穿过车轮 =====
    J_CIRCLE = CIRCLES.get('J', (0.75, 0.8, 0.12))
    if t < 9.6:
        j = load('J')
        jz = keys(t, [(8.9, 1.0), (9.38, 1.25), (9.6, 7.0)], 'in')
        u = keys(t, [(8.9, 0.5), (9.38, J_CIRCLE[0])])
        v = keys(t, [(8.9, 0.55), (9.38, J_CIRCLE[1])])
        sx, sy, sr = shake(t, 9)
        Mj = matrix(j, zoom=jz, u=u, v=v, x=keys(t, [(8.9, 0.5), (9.38, 0.5)]), y=keys(t, [(8.9, 0.55), (9.38, 0.5)]), dx=sx, dy=sy, rot=sr)
        if t >= 9.3:
            kseg(c, t)
        jl = warp(j, Mj)
        if t >= 9.3:
            jl[..., 3] *= 1 - circle_mask(Mj, *J_CIRCLE, j.shape)
        return over(c, jl)

    # ===== 段 6：9.6–10.6 全景 + 葫芦前景 → 仰拍天空 → L 从上滑入 =====
    if t < 10.6:
        kseg(c, t)
        if t >= 10.32:  # L 带斜边从上方压下来
            p = ease(t, 10.32, 10.6, 0.0, 1.0, 'io')
            l = load('L')
            sx, sy, sr = shake(t, 10)
            Ml = matrix(l, zoom=1.08, u=0.5, v=0.5, x=0.5, y=0.5, dx=sx, dy=sy + (p - 1) * 0.15 * H, rot=sr + (1 - p) * 4)
            ll = warp(l, Ml)
            edge = p * (H * 1.25)
            yy, xx = np.mgrid[:H, :W].astype(np.float32)
            line = edge - (xx - W / 2) * 0.35
            ll[..., 3] *= np.clip((line - yy) / 4 + 0.5, 0, 1)
            c = over(c, ll)
        return c

    # ===== 段 7：10.6–11.6 葫芦电机特写，11.6 起叠化回开场（循环） =====
    lz = keys(t, [(10.6, 1.08), (11.6, 1.16), (12.23, 1.3)])
    layer(c, 'L', seed=10, st=t, zoom=lz, u=0.5, v=0.5, x=0.5, y=0.5, rot=keys(t, [(10.6, 0), (11.6, -2.5)]))
    if t >= 11.6:
        a = ease(t, 11.6, 12.1, 0.0, 1.0, 'io')
        # 双重曝光：先出现一个错位的开场画面，再归位
        layer(c, 'W1', seed=1, st=0, alpha=a, zoom=keys(t, [(11.6, 1.25), (12.1, 1.0)]), u=0.52, v=0.62, x=0.5, y=keys(t, [(11.6, 0.5), (12.1, 0.6)]))
    return c


def hook(c, t, zoom):
    """吊钩钩口作为前景框（纯绿已抠掉），zoom 越大越像从镜头前穿过。"""
    h = load('H', key=True)
    hu, hv, _ = CIRCLES.get('H', (0.5, 0.5, 0.3))
    sx, sy, sr = shake(t, 21)
    return over(c, warp(h, matrix(h, zoom=zoom, u=hu, v=hv, x=0.5, y=0.5, dx=sx, dy=sy, rot=sr)))


def kseg(c, t):
    """段 6 的背景与前景：全景 W2 + 葫芦前景，10.2 起切仰拍天空。"""
    if t < 10.2:
        layer(c, 'W2', seed=12, st=t, zoom=keys(t, [(9.3, 1.15), (10.2, 1.22)]), u=0.5, v=0.6, x=0.5, y=0.5)
    else:
        layer(c, 'K2', seed=13, st=t, zoom=keys(t, [(10.2, 1.0), (10.6, 1.08)]), u=0.5, v=0.5, x=keys(t, [(10.2, 0.56), (10.6, 0.5)]), y=0.5, rot=keys(t, [(10.2, 6), (10.6, 0)]))
    dy = keys(t, [(9.3, 0.08), (9.7, 0.0), (10.6, -0.02)]) * H
    layer(c, 'FG_K', key=True, seed=14, st=t, zoom=keys(t, [(9.3, 1.15), (10.6, 1.05)]), u=0.5, v=0.75, x=0.5, y=0.75, dy=dy)
    return c


CIRCLES = {}  # 由 circles.json 覆盖：{"G": [u, v, r], "H": [u, v, r], "J": [u, v, r]}

WHIP = [(6.0, 6.067), (6.8, 6.9), (8.05, 8.12), (8.85, 8.92), (9.5, 9.62), (10.15, 10.25)]


def render_frame(i):
    t = i / FPS
    sub = 5 if any(a <= t <= b for a, b in WHIP) else 1
    acc = np.zeros((H, W, 3), np.float32)
    for k in range(sub):
        tt = t + (k / sub - 0.5) / FPS * 0.9 if sub > 1 else t
        acc += frame(min(max(tt, 0), DUR - 1e-3))[..., :3]
    img = acc / sub
    if 6.0 <= t < 6.067:  # 甩镜：横向运动模糊
        k = np.zeros((1, 61), np.float32); k[:] = 1 / 61
        img = cv2.filter2D(img, -1, k)
    return grade(img, i)


def grade(img, i):
    # 参考片的手机 HDR 调色：S 曲线、加饱和、锐化、轻颗粒
    x = np.clip(img, 0, 1)
    x = x + 0.10 * (x - 0.5) * (1 - np.abs(2 * x - 1))
    hsv = cv2.cvtColor(x, cv2.COLOR_BGR2HSV)
    hsv[..., 1] = np.clip(hsv[..., 1] * 1.08, 0, 1)
    x = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
    blur = cv2.GaussianBlur(x, (0, 0), 2.0)
    x = x + 0.35 * (x - blur)
    rng = np.random.default_rng(i)
    x = x + rng.normal(0, 0.012, x.shape[:2])[..., None].astype(np.float32)
    return (np.clip(x, 0, 1) * 255).astype(np.uint8)


def main():
    import json
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=str(ROOT / 'out' / '卫华起重机-穿梭复刻.mp4'))
    ap.add_argument('--frames', default='')  # 逗号分隔，只导出这些帧为 png
    a = ap.parse_args()
    cj = ROOT / 'circles.json'
    if cj.exists():
        CIRCLES.update({k: tuple(v) for k, v in json.loads(cj.read_text(encoding='utf-8')).items()})
    if a.frames:
        d = ROOT / 'out' / 'frames'; d.mkdir(parents=True, exist_ok=True)
        for f in a.frames.split(','):
            cv2.imwrite(str(d / f'f{int(f):03d}.png'), render_frame(int(f)))
        return
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
           '-i', str(ROOT / 'refs' / '参考视频.mp4'), '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-crf', '17', '-preset', 'medium',
           '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-shortest', '-movflags', '+faststart', a.out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    n = round(DUR * FPS)
    for i in range(n):
        p.stdin.write(render_frame(i).tobytes())
        if i % 30 == 0:
            print(f'{i}/{n}', flush=True)
    p.stdin.close(); p.wait()
    print('done', a.out)


if __name__ == '__main__':
    main()
