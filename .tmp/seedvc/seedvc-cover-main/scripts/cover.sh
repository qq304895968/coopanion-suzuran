#!/bin/bash
# =============================================================================
# cover.sh —— 一条命令把一首歌换成某个角色的声音（Seed-VC 零样本）
#
#   源歌 ──分离──> 人声 + 伴奏
#          └─定调─> 变调半音
#                  └─Seed-VC─> 换嗓后的人声
#                              └─混音─> 成品
#
# 用法:
#   bash cover.sh --song 歌.mp3 --out 成品.mp3                  # 用自带预设音色
#   bash cover.sh --ref 参考30秒.wav --song 歌.mp3 --out 成品.mp3
#   bash cover.sh --ref ref.wav --song song.mp3 --out out.mp3 --shift -2
#   bash cover.sh --ref ref.wav --song song.mp3 --out out.mp3 --no-sep --vocal 现成人声.wav
#
# 参数:
#   --ref PATH      角色的参考音频，30 秒左右，越干净越好
#                   **不给就用插件自带的预设音色**（assets/ref_default.wav）
#   --song PATH     要翻唱的歌（必填）
#   --out PATH      成品路径（默认 out.mp3）
#   --shift N       变调半音。不给就自动量，量不出来会停下来问你要
#   --no-sep        不分离，直接用 --vocal 给的人声
#   --vocal PATH    现成的人声轨（配合 --no-sep）
#   --steps N       扩散步数，默认 30（往上更细更慢，听不出区别就别加）
#   --cfg N         inference-cfg-rate，默认 0.7（高=更贴参考但易僵，低=更自然但不像）
#   --device X      cuda / cpu，默认 cuda
#   --vocal-db N    人声电平，默认相对伴奏 +2 dB
#   --keep          保留中间文件
#
# 环境变量:
#   SEEDVC_DIR   Seed-VC 仓库位置，默认 ~/Seed-VC
#   PY           python 解释器，默认 python
#   RVC_DIR      分离用的 RVC/pymss 仓库，默认 ~/ai_cover/RVC（没有就跳过分离）
# =============================================================================
set -uo pipefail

REF=""; SONG=""; OUT="out.mp3"; SHIFT=""; NO_SEP=0; VOCAL=""
STEPS=30; CFG=0.7; DEVICE="cuda"; VDB=2; KEEP=0

while [ $# -gt 0 ]; do
  case "$1" in
    --ref) REF="$2"; shift 2;;
    --song) SONG="$2"; shift 2;;
    --out) OUT="$2"; shift 2;;
    --shift) SHIFT="$2"; shift 2;;
    --no-sep) NO_SEP=1; shift;;
    --vocal) VOCAL="$2"; shift 2;;
    --steps) STEPS="$2"; shift 2;;
    --cfg) CFG="$2"; shift 2;;
    --device) DEVICE="$2"; shift 2;;
    --vocal-db) VDB="$2"; shift 2;;
    --keep) KEEP=1; shift;;
    -h|--help) sed -n '2,30p' "$0"; exit 0;;
    *) echo "不认识的参数: $1"; exit 2;;
  esac
done

PY="${PY:-python}"
SEEDVC_DIR="${SEEDVC_DIR:-$HOME/Seed-VC}"
RVC_DIR="${RVC_DIR:-$HOME/ai_cover/RVC}"
HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/cover_XXXXXX")"

# 没给 --ref 就用插件自带的预设参考（开箱即用）
USING_DEFAULT_REF=0
if [ -z "$REF" ]; then
  if [ -f "$HERE/../assets/ref_default.wav" ]; then
    REF="$HERE/../assets/ref_default.wav"
    USING_DEFAULT_REF=1
  fi
fi

die() { echo ""; echo "✗ $*"; echo "  中间文件: $WORK"; exit 1; }
ok()  { echo "  ✓ $*"; }
say() { echo ""; echo "== $*"; }

cleanup() { [ "$KEEP" = "1" ] || rm -rf "$WORK"; }
trap cleanup EXIT

# ---------------------------------------------------------------- 0. 体检
say "0. 检查环境和输入"
command -v ffmpeg >/dev/null 2>&1 || die "没装 ffmpeg"
[ -f "$REF" ]  || die "参考音频不存在: $REF"
[ -f "$SONG" ] || die "歌曲不存在: $SONG"
[ -d "$SEEDVC_DIR" ] || die "没找到 Seed-VC 仓库: $SEEDVC_DIR（用 SEEDVC_DIR 指定）"
[ -f "$SEEDVC_DIR/inference.py" ] || die "$SEEDVC_DIR 里没有 inference.py，目录指错了？"

# Seed-VC 的虚拟环境优先（换嗓必须用它）
if [ -x "$SEEDVC_DIR/.venv/bin/python" ]; then
  PY="$SEEDVC_DIR/.venv/bin/python"
elif [ -x "$SEEDVC_DIR/venv/bin/python" ]; then
  PY="$SEEDVC_DIR/venv/bin/python"
fi

# 分离要另一个环境（pymss 依赖 av/torch，Seed-VC 的 venv 里通常没有）
# 找不到就用 PY_SEP 环境变量指定
if [ -z "${PY_SEP:-}" ]; then
  for c in "$HOME/miniconda3/envs/rvc312/bin/python" \
           "$RVC_DIR/.venv/bin/python" "$RVC_DIR/venv/bin/python"; do
    [ -x "$c" ] && { PY_SEP="$c"; break; }
  done
  [ -z "${PY_SEP:-}" ] && PY_SEP="$PY"
fi

REFSEC=$($PY "$HERE/audio_info.py" "$REF" 2>/dev/null | awk '{print $1}' || echo 0)
if [ "$USING_DEFAULT_REF" = "1" ]; then
  ok "参考 预设音色（${REFSEC}s）—— 想换角色加 --ref 你的参考.wav"
else
  ok "参考 $REF（${REFSEC}s）"
fi
ok "源歌 $SONG"
ok "Seed-VC $SEEDVC_DIR"

# ---------------------------------------------------------------- 1. 分离
say "1. 分离人声 / 伴奏"
INST="$WORK/inst.wav"
if [ "$NO_SEP" = "1" ]; then
  [ -f "$VOCAL" ] || die "--no-sep 需要同时给 --vocal"
  VOC="$VOCAL"
  ffmpeg -y -v error -i "$SONG" -ac 1 -ar 44100 "$INST" || die "伴奏准备失败"
  ok "跳过分離，用人声: $VOC"
else
  if [ ! -d "$RVC_DIR/tools/pymss" ]; then
    die "找不到分离工具 $RVC_DIR/tools/pymss
  两个办法：
    a) 装 UVR5 或 pymss，用 RVC_DIR 指向它
    b) 自己先分离好，用 --no-sep --vocal 人声.wav 跑"
  fi
  ( cd "$RVC_DIR" && PYTHONPATH="$RVC_DIR" $PY_SEP -m tools.pymss.cli infer 1_HP-UVR.pth \
      --download --source modelscope -i "$SONG" -o "$WORK/sep" \
      --device "$DEVICE" --format wav ) >"$WORK/sep.log" 2>&1 \
    || die "分离失败，看日志: $WORK/sep.log
  （常见原因：Python 环境不对。分离要一个装了 av 和 torch 的环境，
    不是 Seed-VC 那个 venv。用 PY_SEP=/path/to/python 指定）"
  VOC="$(ls "$WORK"/sep/*Vocals* 2>/dev/null | head -1)"
  INST_SRC="$(ls "$WORK"/sep/*Instrumental* 2>/dev/null | head -1)"
  [ -f "$VOC" ] || die "分离没产出人声，看日志: $WORK/sep.log"
  [ -f "$INST_SRC" ] && cp "$INST_SRC" "$INST"
  ok "人声 $(basename "$VOC")"
fi

# ---------------------------------------------------------------- 2. 定调
say "2. 定调"
if [ -z "$SHIFT" ]; then
  SHIFT=$($PY "$HERE/pitch_match.py" "$VOC" "$REF" 2>/dev/null | tail -1)
  case "$SHIFT" in
    ''|*[!0-9-]*) SHIFT=$(echo "$SHIFT" | sed -n 's/.*shift=\([-0-9]*\).*/\1/p');;
  esac
fi
if [ -z "$SHIFT" ]; then
  echo "  量不出来两个音高差。两个办法："
  echo "    a) pip install librosa  再跑一次"
  echo "    b) 自己听一遍定：源比角色高就填负数，低就填正数，比如 --shift -2"
  die "变调没定下来"
fi
ok "变调 ${SHIFT} 半音"

# ---------------------------------------------------------------- 3. 换嗓
say "3. Seed-VC 换嗓"
SRC_16K="$WORK/src16k.wav"
ffmpeg -y -v error -i "$VOC" -ac 1 -ar 44100 "$SRC_16K" || die "人声预处理失败"
OUTDIR="$WORK/vc"
mkdir -p "$OUTDIR"
( cd "$SEEDVC_DIR" && HF_ENDPOINT="${HF_ENDPOINT:-https://hf-mirror.com}" \
    $PY inference.py --source "$SRC_16K" --target "$REF" --output "$OUTDIR" \
    --diffusion-steps "$STEPS" --f0-condition True --semi-tone-shift "$SHIFT" \
    --inference-cfg-rate "$CFG" --fp16 "$([ "$DEVICE" = "cpu" ] && echo False || echo True)" \
) >"$WORK/vc.log" 2>&1 || die "换嗓失败，看日志: $WORK/vc.log"
VC="$(ls -t "$OUTDIR"/*.wav 2>/dev/null | head -1)"
[ -f "$VC" ] || die "换嗓没产出文件，看日志: $WORK/vc.log"
ok "换嗓完成 $(basename "$VC")"

# ---------------------------------------------------------------- 4. 伴奏跟调
say "4. 伴奏跟调"
INST_P="$WORK/inst_p.wav"
if [ "$SHIFT" != "0" ]; then
  # rubberband 的 pitch 是倍率，不是半音
  RATIO=$($PY -c "print(2**($SHIFT/12))")
  ffmpeg -y -v error -i "$INST" -af "rubberband=pitch=$RATIO" "$INST_P" 2>/dev/null \
    || { echo "  ! rubberband 不可用，伴奏不变调（人声会跑调）"; cp "$INST" "$INST_P"; }
  ok "伴奏变调 ${SHIFT} 半音"
else
  cp "$INST" "$INST_P"
  ok "原调，伴奏不动"
fi

# ---------------------------------------------------------------- 5. 混音
say "5. 混音"
MIXED="$WORK/mixed.wav"
$PY "$HERE/mix_two.py" "$VC" "$INST_P" "$MIXED" --vocal-db "$VDB" >"$WORK/mix.log" 2>&1 \
  || die "混音失败，看日志: $WORK/mix.log"

ffmpeg -y -v error -i "$MIXED" -af "loudnorm=I=-14:TP=-1.0:LRA=11" \
  -c:a libmp3lame -b:a 320k "$OUT" || die "出片失败"
ok "$OUT"

# ---------------------------------------------------------------- 6. 验收
say "6. 验收"
DUR_SRC=$($PY "$HERE/audio_info.py" "$SONG" 2>/dev/null | awk '{print $1}')
DUR_OUT=$($PY "$HERE/audio_info.py" "$OUT" 2>/dev/null | awk '{print $1}')
echo "  源 ${DUR_SRC}s → 成品 ${DUR_OUT}s"
$PY - "$DUR_SRC" "$DUR_OUT" <<'PYEOF' || true
import sys
try:
    a, b = float(sys.argv[1]), float(sys.argv[2])
    d = abs(a - b)
    print("  %s 时长差 %.1fs" % ("✓" if d < 1.0 else "✗", d))
    if d >= 1.0:
        print("    差太多，多半是中间产物串了，或者分离把尾巴吃掉了")
except Exception:
    pass
PYEOF

echo ""
echo "============================================================"
echo "成品: $OUT"
echo ""
echo "⚠️ 收工前自己听三件事："
echo "   1. 像不像那个角色（分数只量像不像，量不出好不好听）"
echo "   2. 有没有电音（沙沙的金属感）——有就查变调是不是降太多"
echo "   3. 人声和伴奏的比例对不对——人声被埋就加 --vocal-db 3"
echo "============================================================"
[ "$KEEP" = "1" ] && echo "中间文件: $WORK"
