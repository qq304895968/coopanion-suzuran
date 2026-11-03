const signed = (value) => `${value >= 0 ? '+' : ''}${(Math.round(value * 10) / 10).toFixed(1)}`;
const overviewPanel = {
    async mount(ctx) {
        const zh = ctx.language.startsWith('zh');
        const t = (z, e) => (zh ? z : e);
        const visibilityLabel = (value) => (value === 'hidden'
            ? t('完全隐藏', 'Hidden')
            : value === 'exact' ? t('精确展示', 'Exact') : t('模糊展示', 'Fuzzy'));
        const sheet = ctx.ui.sheet({
            title: t('心情概览', 'Mood overview'),
            desc: t('底色影响说法、想法、待机表现与主动程度；具体情绪标签仍会波动。这里只给你看，聊天里角色不会主动报数字。', 'The mood colours how the pet talks, thinks, idles and reaches out; the moment-to-moment emotion tag still fluctuates. This page is for you; the character does not report numbers in chat.'),
        });
        ctx.root.append(sheet.el);
        const status = ctx.ui.msgline('');
        const stats = ctx.ui.statgrid();
        const bar = ctx.ui.progress({ label: t('当前心情', 'Current mood'), max: 100, value: 0, format: (v) => `${Math.round(v)}/100`, tone: 'plain' });
        const bandLine = ctx.ui.msgline('');
        const thinking = ctx.ui.msgline('');
        const style = ctx.ui.msgline('');
        const behavior = ctx.ui.msgline('');
        const featureLine = ctx.ui.msgline('');
        const todayGrid = ctx.ui.statgrid();
        sheet.body.append(status, stats, bar.el, bandLine, thinking, style, behavior, featureLine, ctx.ui.section(t('今天', 'Today')), todayGrid);
        // ---- History ---------------------------------------------------------
        const historySheet = ctx.ui.foldSheet('mood-history', {
            title: t('每日结算', 'Daily settlements'),
            desc: t('保留最近 14 天；完整历史在存储里按配置的天数保留。', 'The last 14 days are shown; the store keeps the configured number of days.'),
            defaultOpen: true,
        });
        ctx.root.append(historySheet.el);
        const historyTable = ctx.ui.table({
            head: [t('日期', 'Date'), t('最终', 'Final'), t('高 / 低', 'High / low')],
            maxHeight: '260px',
        });
        historySheet.body.append(historyTable.el);
        const recentSheet = ctx.ui.foldSheet('mood-recent', {
            title: t('最近变化', 'Recent changes'),
            desc: t('每次实际生效的变化，含来源、原因与是否受单日上限限制。', 'Each applied change, with its source, reason and whether a daily cap limited it.'),
        });
        ctx.root.append(recentSheet.el);
        const recentTable = ctx.ui.table({
            head: [t('时刻', 'Time'), t('来源', 'Source'), t('变化', 'Delta'), t('之后', 'After'), t('原因', 'Reason')],
            maxHeight: '300px',
        });
        recentSheet.body.append(recentTable.el);
        // ---- Persona detection ----------------------------------------------
        const personaSheet = ctx.ui.foldSheet('mood-persona', {
            title: t('人设识别', 'Persona detection'),
            desc: t('读工作区里的 CONSTITUTION.md，按关键词估一套参数：模板、黏人程度、中性锚点、正面/负面系数。识别结果会写成「自定义」，之后仍可手改。', 'Reads CONSTITUTION.md and estimates a preset, attachment, anchor and coefficients. The result is written as Custom, and you can still edit it afterwards.'),
            defaultOpen: true,
        });
        ctx.root.append(personaSheet.el);
        const detectLine = ctx.ui.msgline(t('还没识别。', 'Not detected yet.'));
        const evidenceLine = ctx.ui.msgline('');
        const detectRow = ctx.ui.rowbar();
        const detectButton = ctx.ui.button(t('从 CONSTITUTION.md 识别', 'Detect from CONSTITUTION.md'), {
            size: 'sm',
            onClick: () => { void detect(); },
        });
        const applyButton = ctx.ui.button(t('应用识别结果', 'Apply detected values'), {
            variant: 'primary',
            size: 'sm',
            onClick: () => { void applyDetection(); },
        });
        applyButton.disabled = true;
        detectRow.append(detectButton, applyButton);
        personaSheet.body.append(detectLine, evidenceLine, detectRow);
        let lastDetection = null;
        // ---- Debug / manual controls ----------------------------------------
        const debugSheet = ctx.ui.foldSheet('mood-debug', {
            title: t('手动调整', 'Manual controls'),
            desc: t('调试用：直接设值或重置。会写进最近变化，但不消耗当天上限。', 'For debugging: set or reset the value. The change is recorded but does not use the daily caps.'),
        });
        ctx.root.append(debugSheet.el);
        const valueInput = ctx.ui.input({
            type: 'number',
            value: '60',
            placeholder: '0–100',
        });
        const setButton = ctx.ui.button(t('设为这个值', 'Set to this value'), {
            size: 'sm',
            onClick: () => { void setValue(); },
        });
        const resetButton = ctx.ui.button(t('重置到中性锚点', 'Reset to anchor'), {
            variant: 'danger',
            size: 'sm',
            onClick: () => { void reset(); },
        });
        const refreshButton = ctx.ui.button(t('刷新', 'Refresh'), {
            size: 'sm',
            onClick: () => { void load(); },
        });
        const controlRow = ctx.ui.rowbar();
        controlRow.append(valueInput, setButton, resetButton, refreshButton);
        debugSheet.body.append(controlRow);
        let loading = false;
        let current = null;
        const setStatus = (text, bad = false) => {
            status.textContent = text;
            status.classList.toggle('bad', bad);
        };
        const load = async () => {
            if (loading)
                return;
            loading = true;
            try {
                current = await ctx.invoke('state');
                render(current);
                setStatus(t(`更新于 ${current.updatedAt || '—'}`, `Updated ${current.updatedAt || '—'}`));
            }
            catch (error) {
                setStatus(error instanceof Error ? error.message : String(error), true);
            }
            finally {
                loading = false;
            }
        };
        const render = (state) => {
            stats.replaceChildren(ctx.ui.stat({ k: t('当前', 'Current'), v: state.value, unit: '/100', accent: true }), ctx.ui.stat({ k: t('区间', 'Band'), v: state.bandLabel }), ctx.ui.stat({ k: t('今日对话', 'Dialogue'), v: signed(state.today.dialogue) }), ctx.ui.stat({ k: t('今日浏览', 'Browsing'), v: signed(state.today.browse) }), ctx.ui.stat({ k: t('今日搭理', 'Attention'), v: signed(state.today.attention) }), ctx.ui.stat({ k: t('连续低落', 'Low days'), v: state.lowDays, unit: t('天', 'd') }));
            bar.setValue(state.value, 100);
            // The host's progress does not expose a tone setter; apply its class directly.
            bar.el.classList.remove('warnc', 'dreamc');
            if (state.value <= 40)
                bar.el.classList.add('warnc');
            else if (state.value >= 81)
                bar.el.classList.add('dreamc');
            bandLine.textContent = t(`${state.bandLabel}（${state.range}） · 人设：${state.persona.label}`, `${state.bandLabel} (${state.range}) · Persona: ${state.persona.label}`);
            thinking.textContent = t(`思维方式：${state.thinking.join('；')}`, `Thinking: ${state.thinking.join('; ')}`);
            style.textContent = t(`说法：${state.dialogue}`, `Style: ${state.dialogue}`);
            behavior.textContent = t(`表现：${state.behavior}`, `Behaviour: ${state.behavior}`);
            featureLine.textContent = t(`功能影响：${state.features}`, `Features: ${state.features}`);
            todayGrid.replaceChildren(ctx.ui.stat({ k: t('高', 'High'), v: state.today.high }), ctx.ui.stat({ k: t('低', 'Low'), v: state.today.low }), ctx.ui.stat({ k: t('外部事件', 'Events'), v: signed(state.today.event) }), ctx.ui.stat({ k: t('最近标签', 'Last tag'), v: state.lastEmotion?.emotion ?? '—' }), ctx.ui.stat({ k: t('可见性', 'Visibility'), v: visibilityLabel(state.visibility) }), ctx.ui.stat({ k: t('模型自报', 'Self-report'), v: state.modelReport ? t('开', 'on') : t('关', 'off') }), ctx.ui.stat({
                k: t('小游戏', 'Mini-game'),
                v: state.gal.enabled ? `${state.gal.startedToday}/${state.gal.dailyLimit}` : t('关闭', 'off'),
                unit: state.gal.enabled && state.gal.active ? t('进行中', 'active') : undefined,
            }));
            historyTable.clear(t('还没有每日结算。', 'No daily settlement yet.'));
            for (const entry of state.history) {
                historyTable.addRow([entry.date, String(entry.final_value), `${entry.high} / ${entry.low}`]);
            }
            recentTable.clear(t('还没有记录。', 'No changes yet.'));
            for (const change of state.recent) {
                recentTable.addRow([
                    change.at.slice(11, 16),
                    change.source,
                    signed(change.delta),
                    String(change.after),
                    `${change.reason}${change.capped ? t(' [达到上限]', ' [capped]') : ''}`,
                ]);
            }
            valueInput.value = String(state.value);
        };
        const detect = async () => {
            detectButton.disabled = true;
            try {
                const result = await ctx.invoke('analyzePersona');
                if (!result.ok || !result.detection) {
                    lastDetection = null;
                    applyButton.disabled = true;
                    detectLine.textContent = result.error ?? t('识别失败。', 'Detection failed.');
                    detectLine.classList.add('bad');
                    evidenceLine.textContent = '';
                    return;
                }
                lastDetection = result.detection;
                detectLine.classList.remove('bad');
                detectLine.textContent = t(`识别为：${result.detection.label} · 置信度 ${Math.round(result.detection.confidence * 100)}% · ${result.textLength} 字`, `Detected: ${result.detection.label} · confidence ${Math.round(result.detection.confidence * 100)}% · ${result.textLength} chars`);
                evidenceLine.textContent = result.detection.evidence.length
                    ? t(`依据：${result.detection.evidence.join('、')}`, `Evidence: ${result.detection.evidence.join(', ')}`)
                    : t('没有命中明显关键词，会使用中性模板。', 'No strong keywords; the neutral preset is used.');
                applyButton.disabled = false;
            }
            catch (error) {
                detectLine.textContent = error instanceof Error ? error.message : String(error);
                detectLine.classList.add('bad');
            }
            finally {
                detectButton.disabled = false;
            }
        };
        const applyDetection = async () => {
            const d = lastDetection;
            if (!d)
                return;
            applyButton.disabled = true;
            try {
                const note = `识别自 CONSTITUTION.md：${d.label}${d.evidence.length ? `（${d.evidence.join('、')}）` : ''}`.slice(0, 300);
                await ctx.setConfig('world:mood-persona', {
                    'worlds.mood.personaPreset': 'custom',
                    'worlds.mood.attachment': d.attachment,
                    'worlds.mood.neutralPoint': d.neutralPoint,
                    'worlds.mood.positiveCoeff': d.positiveCoeff,
                    'worlds.mood.negativeCoeff': d.negativeCoeff,
                    'worlds.mood.personaNote': note,
                });
                ctx.ui.toast(t('已写入心情人设配置', 'Persona values written to the Mood config'), 'ok');
                lastDetection = null;
                await load();
            }
            catch (error) {
                ctx.ui.toast(error instanceof Error ? error.message : String(error), 'bad');
                applyButton.disabled = false;
            }
        };
        const setValue = async () => {
            const value = Number(valueInput.value);
            if (!Number.isFinite(value)) {
                ctx.ui.toast(t('请输入 0–100 的数值', 'Enter a number from 0 to 100'), 'bad');
                return;
            }
            try {
                await ctx.invoke('setValue', [value]);
                ctx.ui.toast(t('已设置', 'Set'), 'ok');
                await load();
            }
            catch (error) {
                ctx.ui.toast(error instanceof Error ? error.message : String(error), 'bad');
            }
        };
        const reset = async () => {
            const ok = await ctx.ui.confirm({
                title: t('重置心情？', 'Reset the mood?'),
                body: t('会把当前值设回中性锚点，并记录一次手动调整；历史保留。', 'Sets the value back to the neutral anchor and records a manual change; history is kept.'),
            });
            if (!ok)
                return;
            try {
                await ctx.invoke('reset');
                ctx.ui.toast(t('已重置', 'Reset'), 'ok');
                await load();
            }
            catch (error) {
                ctx.ui.toast(error instanceof Error ? error.message : String(error), 'bad');
            }
        };
        await load();
        ctx.interval(() => { void load(); }, 20_000);
    },
};
export default { panels: { overview: overviewPanel } };
