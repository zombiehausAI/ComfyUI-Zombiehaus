import { app } from "../../scripts/app.js";
import { ComfyWidgets } from "../../scripts/widgets.js";

// Zombiehaus ShowText & Person Inpaint Prompt Hint Director

function getPromptHintForPreset(preset) {
    if (!preset) return "";
    const p = String(preset);

    if (p.includes("Kiss & Finger") || p.includes("Kiss & Caress")) {
        return (
            "Two women locked in an intimate embrace, their lips pressed together in a passionate, deep kiss " +
            "with tilted heads, while one woman's slender hand reaches down between her partner's parted thighs, " +
            "fingers delicately caressing and fingering the glistening wet folds, bodies pressed flush against each other, " +
            "soft sensual lighting, authentic skin texture, cinematic warmth."
        );
    }
    if (p.includes("Kiss & Stroke") || (p.includes("Kiss") && p.includes("Handjob"))) {
        return (
            "Two women kissing passionately, heads tilted and lips softly locked together, while one woman " +
            "reaches down with her hand wrapped firmly around her partner's erect shaft, stroking in rhythm with the kiss, " +
            "fingers with polished nails gripping tightly, pre-cum, bodies pressed close together, warm romantic bedroom atmosphere."
        );
    }
    if (p.includes("Kiss & Breast Fondle")) {
        return (
            "Two women kissing tenderly with parted lips, eyes closed in pleasure, while one woman's warm hand " +
            "cups and gently fondles her partner's soft breast, thumb grazing across the sensitive erect nipple, " +
            "chest to chest intimacy, warm natural lighting, sensual mood."
        );
    }
    if (p.includes("Paizuri & Kiss")) {
        return (
            "Passionate paizuri breast play combined with tender kissing, breasts pressed tightly around the erect shaft " +
            "while leaning up to press lips against her partner's mouth, passionate eye contact, wet cleavage, flushed skin."
        );
    }
    if (p.includes("Embrace & Intimate Touch")) {
        return (
            "An intimate embrace with arms wrapped around each other, one woman sliding a hand down over the other's hip " +
            "and between her thighs in tender sensual caresses, lips whispering against her neck, goosebumps, warm romantic lighting."
        );
    }
    if (p.includes("Full Frontal")) {
        return (
            "Two women intimately entangled along their entire bodies, faces close in a tender kiss, hands exploring " +
            "each other's waist, hips, and groin, bodies pressed together with natural warmth, authentic candid photography."
        );
    }
    if (p.includes("Sitting Beside") && (p.includes("Masturbation") || p.includes("Handjob"))) {
        return (
            "A woman sitting closely beside her on the bed, leaning in with one hand firmly wrapped around " +
            "her erect penis, stroking the shaft with slender manicured fingers, pre-cum, glistening wetness, " +
            "looking into her eyes with an open-mouthed sensual smile, relaxed intimate bedroom setting."
        );
    }
    if (p.includes("Lying Beside") && (p.includes("Masturbation") || p.includes("Handjob"))) {
        return (
            "A woman lying comfortably on her side beside her, propped on one elbow, reaching over with her hand " +
            "wrapped around her partner's erect shaft, gently stroking, soft bed sheets, relaxed tender expression, natural window light."
        );
    }
    if (p.includes("Kneeling") && (p.includes("Masturbation") || p.includes("Handjob"))) {
        return (
            "A woman kneeling closely between her knees, reaching out with both hands firmly wrapped around " +
            "her erect penis, stroking the shaft, fingers with polished nails gripping tightly, pre-cum, " +
            "veiny texture, looking up into her eyes with an open-mouthed sensual expression, glistening wetness."
        );
    }
    if (p.includes("Masturbation") || p.includes("Handjob")) {
        return (
            "A woman positioned closely beside her, reaching out with a hand firmly wrapped around " +
            "her erect penis, stroking the shaft, fingers with polished nails gripping tightly, pre-cum, " +
            "veiny texture, looking up into her eyes with an open-mouthed sensual expression, glistening wetness."
        );
    }
    if (p.includes("Oral") || p.includes("Fellatio") || p.includes("Blowjob")) {
        return (
            "A woman positioned between her parted legs, head tilted down, performing deep oral fellatio, " +
            "warm lips wrapped tightly around the shaft, tongue licking the sensitive tip, looking up with " +
            "lustful eyes, messy hair, wet glistening skin, saliva strings, sensual natural lighting."
        );
    }
    if (p.includes("Cunnilingus") || p.includes("Pussy Licking")) {
        return (
            "A woman positioned between her spread legs, face buried between her thighs, performing intimate cunnilingus, " +
            "tongue licking the glistening wet vulva and clitoris, fingers gently parting the labia, eyes closed in ecstasy, " +
            "arousal, glistening wet juices, authentic skin pores."
        );
    }
    if (p.includes("Paizuri") || p.includes("Titjob") || p.includes("Breast Play")) {
        return (
            "A woman pressing her generous soft breasts tightly together around an erect shaft in passionate paizuri, " +
            "hands cupping her cleavage, cleavage pressed firmly, glistening baby oil, looking up sensually, flush cheeks."
        );
    }
    if (p.includes("Female Masturbation") || p.includes("Fingering")) {
        return (
            "A woman positioned closely beside her, reaching down between her thighs, gentle caressing and fingering, " +
            "slender fingers glistening with natural arousal, touching the wet sensitive folds, tender moan, intimate bedroom atmosphere."
        );
    }
    if (p.includes("Straddling") || p.includes("Cowgirl")) {
        return (
            "Two women engaged in passionate intercourse, one mounted and straddling astride the other's hips, " +
            "arching her back in pleasure, breasts swaying, hands planted on partner's chest, deep penetration, intense gaze, authentic sweat beads."
        );
    }
    if (p.includes("Missionary") || p.includes("Face-to-Face")) {
        return (
            "Two women engaged in intimate face-to-face missionary intercourse, bodies pressed together from chest to thighs, " +
            "interlocking fingers, legs wrapped around hips, tender yet intense passion, parted lips, glistening skin, soft warm shadows."
        );
    }
    if (p.includes("Doggy") || p.includes("From Behind")) {
        return (
            "Passionate intercourse from behind, hands gripping hips tightly, arched lower back, round buttocks, " +
            "deep intimate connection, flushed skin, breathless expression, dynamic authentic perspective."
        );
    }
    if (p.includes("Footjob") || p.includes("Soles")) {
        return (
            "A woman skillfully stroking with the soft soles and arched instep of her bare feet, delicate pedicured toes, " +
            "gentle pressure, sensual teasing, reclining playfully on silky sheets, warm bedroom lighting."
        );
    }
    if (p.includes("Massage") || p.includes("Oil Rub")) {
        return (
            "A woman positioned over her, hands glistening with warm aromatic massage oil, gently rubbing shoulders and back, " +
            "smooth soothing touch, glowing warm candlelight, relaxed blissful expression."
        );
    }
    if (p.includes("Kissing")) {
        return (
            "Two women kissing passionately, heads tilted, lips softly pressed together, tender embrace, " +
            "arms draped around neck, closed eyes, intimate romantic moment, warm natural sunlight."
        );
    }
    if (p.includes("Holding Hands")) {
        return (
            "A woman standing beside her holding hands tightly, fingers gently interlaced, natural hand clasp, " +
            "smiling warmly, bodies standing close together, natural eye contact, candid 35mm photo."
        );
    }
    if (p.includes("Spooning") || p.includes("Back Hug")) {
        return (
            "A woman embracing her from behind in an intimate back hug, arms wrapped around her waist, " +
            "chin resting on her shoulder, soft gentle smile, cozy atmosphere, warm golden hour glow."
        );
    }
    if (p.includes("Lap Sitting")) {
        return (
            "A woman sitting playfully on her lap, arms loosely draped around her neck, smiling into each other's eyes, " +
            "bodies pressed together, casual intimate pose, natural lighting."
        );
    }
    if (p.includes("Head on Lap")) {
        return (
            "A woman resting her head gently on her partner's lap, looking up with loving eyes, " +
            "gentle hand caressing and brushing through her soft hair, peaceful tender moment, soft window light."
        );
    }
    if (p.includes("Embrace")) {
        return (
            "A woman standing beside her with an arm warmly draped over her shoulder, fingers resting on her clavicle, " +
            "laughing together, close intimate camaraderie, natural posture, candid portrait."
        );
    }
    return "Describe the second person, their pose, action, and physical contact with the existing person.";
}

app.registerExtension({
    name: "zombiehaus.ShowText",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        // ── ZombiehausShowText ─────────────────────────────────────────────
        if (nodeData.name === "ZombiehausShowText") {
            function populate(text) {
                if (!text) return;

                if (this.widgets) {
                    const isConvertedWidget = +!!this.inputs?.[0]?.widget;
                    for (let i = isConvertedWidget; i < this.widgets.length; i++) {
                        this.widgets[i]?.onRemove?.();
                    }
                    this.widgets.length = isConvertedWidget;
                }

                const v = Array.isArray(text) ? [...text] : [text];
                if (v.length > 1 && !v[0]) {
                    v.shift();
                }

                for (let list of v) {
                    if (!(list instanceof Array)) list = [list];
                    for (const l of list) {
                        const strVal = String(l ?? "");
                        let w = null;
                        if (ComfyWidgets && ComfyWidgets["STRING"]) {
                            const res = ComfyWidgets["STRING"](
                                this,
                                "text_" + (this.widgets?.length ?? 0),
                                ["STRING", { multiline: true }],
                                app
                            );
                            w = res?.widget || res;
                        }
                        if (!w && this.addWidget) {
                            w = this.addWidget("text", "text_" + (this.widgets?.length ?? 0), strVal, () => {}, { multiline: true });
                        }
                        if (w) {
                            if (w.inputEl) {
                                w.inputEl.readOnly = true;
                                w.inputEl.style.opacity = "0.7";
                                w.inputEl.value = strVal;
                            } else if (w.element) {
                                w.element.readOnly = true;
                                w.element.style.opacity = "0.7";
                                w.element.value = strVal;
                            }
                            w.value = strVal;
                        }
                    }
                }

                requestAnimationFrame(() => {
                    const sz = this.computeSize();
                    if (sz[0] < this.size[0]) {
                        sz[0] = this.size[0];
                    }
                    if (sz[1] < this.size[1]) {
                        sz[1] = this.size[1];
                    }
                    this.onResize?.(sz);
                    app.graph?.setDirtyCanvas?.(true, false);
                });
            }

            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                onNodeCreated?.apply(this, arguments);
                this.populate = populate.bind(this);
            };

            const onExecuted = nodeType.prototype.onExecuted;
            nodeType.prototype.onExecuted = function (message) {
                onExecuted?.apply(this, arguments);
                this.populate = populate.bind(this);
                populate.call(this, message.text);
            };

            const VALUES = Symbol();
            const configure = nodeType.prototype.configure;
            nodeType.prototype.configure = function () {
                this[VALUES] = arguments[0]?.widgets_values;
                return configure?.apply(this, arguments);
            };

            const onConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function () {
                onConfigure?.apply(this, arguments);
                this.populate = populate.bind(this);
                const widgets_values = this[VALUES];
                if (widgets_values?.length) {
                    requestAnimationFrame(() => {
                        populate.call(
                            this,
                            widgets_values.slice(+(widgets_values.length > 1 && this.inputs?.[0]?.widget))
                        );
                    });
                }
            };
        }

        // ── ZombiehausPersonInpaint, ZombiehausPersonaInteract & ZombiehausDualPersonaDirector ──
        if (nodeData.name === "ZombiehausPersonInpaint" || nodeData.name === "ZombiehausPersonaInteract" || nodeData.name === "ZombiehausDualPersonaDirector") {
            function syncPromptHint(node, presetVal) {
                const hint = getPromptHintForPreset(presetVal);
                if (!hint || !node.outputs) return;

                // Find connected ShowText node via output slot (prompt_hint)
                const promptHintOutput = node.outputs.find(o => o.name === "prompt_hint") || node.outputs[2] || node.outputs[3];
                if (promptHintOutput && promptHintOutput.links) {
                    for (const linkId of promptHintOutput.links) {
                        const link = app.graph?.links?.[linkId];
                        if (!link) continue;
                        const targetNode = app.graph?.getNodeById?.(link.target_id);
                        if (targetNode) {
                            if (typeof targetNode.populate === "function") {
                                targetNode.populate([hint]);
                            } else if (targetNode.widgets) {
                                for (const tw of targetNode.widgets) {
                                    if (tw.name?.startsWith("text_") || tw.type === "customtext" || tw.type === "text") {
                                        tw.value = hint;
                                        if (tw.inputEl) tw.inputEl.value = hint;
                                        if (tw.element) tw.element.value = hint;
                                    }
                                }
                                targetNode.setDirtyCanvas?.(true, false);
                            }
                        }
                    }
                }
            }

            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                onNodeCreated?.apply(this, arguments);
                const node = this;

                const presetWidget = node.widgets?.find(w => w.name === "interaction_preset" || w.name === "interaction_mode");
                if (presetWidget) {
                    const origCb = presetWidget.callback;
                    presetWidget.callback = function (val) {
                        origCb?.apply(this, arguments);
                        syncPromptHint(node, val);
                    };
                }

                // Initial sync after load
                requestAnimationFrame(() => {
                    if (presetWidget) {
                        syncPromptHint(node, presetWidget.value);
                    }
                });
            };

            const onConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function () {
                onConfigure?.apply(this, arguments);
                const node = this;
                requestAnimationFrame(() => {
                    const presetWidget = node.widgets?.find(w => w.name === "interaction_preset" || w.name === "interaction_mode");
                    if (presetWidget) {
                        syncPromptHint(node, presetWidget.value);
                    }
                });
            };
        }
    },
});
