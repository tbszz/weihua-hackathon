#!/usr/bin/env bash
# 参考片与成片左右并排对比：out/对比.mp4 以及 10fps 对比联系表
P="$(cd "$(dirname "$0")" && pwd)"
ffmpeg -v error -y -i "$P/refs/参考视频.mp4" -i "$P/out/卫华起重机-穿梭复刻.mp4" -filter_complex "[0:v]scale=540:960[a];[1:v]scale=540:960[b];[a][b]hstack" -map 1:a -c:v libx264 -crf 20 -c:a copy "$P/out/对比.mp4"
ffmpeg -v error -y -i "$P/out/对比.mp4" -vf "fps=5,scale=360:-1,tile=8x4:padding=3" -frames:v 2 "$P/out/对比联系表_%d.png"
echo ok
