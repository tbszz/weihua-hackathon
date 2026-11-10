#!/usr/bin/env bash
# 用法：bash gen.sh <id> [额外参考图...]   读取 prompts/<id>.txt，Codex image_gen 生成 shots/<id>.png
set -u
P="$(cd "$(dirname "$0")" && pwd)"
id="$1"; shift
out="$P/shots"
[ -f "$out/$id.png" ] && { echo "skip $id"; exit 0; }
imgs=(-i "$P/refs/weihua-gantry.jpg" -i "$P/refs/weihua-hoist-girder.jpg" -i "$P/refs/weihua-hoist-front.jpg")
for r in "$@"; do imgs+=(-i "$r"); done
{
echo "使用你内置的 image_gen 工具生成 1 张竖版 9:16（或 2:3 竖版）图片，不要写代码画图，不要修改任何其他文件。"
echo "附带的参考图是卫华起重机（WEIHUA）真实产品：黄色单梁门式起重机，红色带白色“卫华起重/WEIHUA”标识的欧式电动葫芦，黄色吊钩。保持这些结构、配色和品牌标识一致。"
echo "画面："; cat "$P/prompts/$id.txt"
echo "统一风格：手机竖屏实拍照片质感，傍晚低角度金色斜阳，HDR 高饱和、强清晰度、高对比，偏青蓝天空与暖黄高光，真实摄影，不是渲染图，不是插画，画面中不要出现水印和多余文字。"
echo "生成后把图片复制到当前目录，命名为 $id.png（覆盖同名文件），最后只回复该文件的绝对路径。"
} | codex exec --skip-git-repo-check --sandbox workspace-write -C "$out" "${imgs[@]}" - > "$P/prompts/$id.log" 2>&1
[ -f "$out/$id.png" ] && echo "done $id" || { echo "FAIL $id"; tail -5 "$P/prompts/$id.log"; }
