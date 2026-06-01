/* ==========================================================================
   PromptFlow AI - Prompt Enhancer & Compiler Module (enhancer.js)
   ========================================================================== */

import { CodingShield } from './templates.js';

export const PromptEnhancer = {
    
    // --- Assemble Prompt from Guided Architect Fields ---
    assembleArchitectPrompt(fields) {
        const { role, goal, tasks, constraints, format } = fields;
        
        let prompt = '';
        
        if (role) {
            prompt += `# Role\n${role.trim()}\n\n`;
        }
        
        if (goal) {
            prompt += `# Context & Goal\n${goal.trim()}\n\n`;
        }
        
        if (tasks) {
            prompt += `# Specific Checklist Deliverables\n${tasks.trim()}\n\n`;
        }
        
        if (constraints) {
            prompt += `# Strict Rules & Constraints\n${constraints.trim()}\n\n`;
        }
        
        if (format) {
            let formatText = '';
            switch (format) {
                case 'code-only':
                    formatText = 'Please deliver fully operational code blocks, ready to copy-paste. Include necessary dependency lists and import statements.';
                    break;
                case 'code-diff':
                    formatText = 'Please output in standard Git diff format showing clearly what lines of code should be removed and what lines should be added.';
                    break;
                case 'step-by-step':
                    formatText = 'Provide a structured educational tutorial. Explain the logical steps first, then show the code block, and list how to test it.';
                    break;
                case 'spec-md':
                    formatText = 'Output a comprehensive systems design specification document in clean, tabular Markdown format.';
                    break;
                default:
                    formatText = format.trim();
            }
            prompt += `# Desired Output Format\n${formatText}\n`;
        }
        
        return prompt.trim();
    },

    // --- Dynamic AI Prompt Enhancer ---
    async enhanceWithAi(rawThought, config, activeShields, targetLang = 'en') {
        const { provider, key, model } = config;
        
        // Assemble chosen shield guardrails to append to the prompt
        let guardrailsBlock = '';
        if (activeShields.antiTruncation) guardrailsBlock += `${CodingShield.antiTruncation}\n`;
        if (activeShields.preserveComments) guardrailsBlock += `${CodingShield.preserveComments}\n`;
        if (activeShields.planFirst) guardrailsBlock += `${CodingShield.planFirst}\n`;
        if (activeShields.tailwindLock) guardrailsBlock += `${CodingShield.tailwindLock}\n`;
        
        if (!guardrailsBlock) {
            guardrailsBlock = 'Ensure clean coding standards and do not leave incomplete statements.';
        }

        let translationInstruction = '';
        if (targetLang && targetLang !== 'en') {
            const langNames = {
                'es': 'Spanish (Español)',
                'fr': 'French (Français)',
                'ja': 'Japanese (日本語)',
                'de': 'German (Deutsch)',
                'hi': 'Hindi (हिन्दी)'
            };
            const targetLangName = langNames[targetLang] || targetLang;
            translationInstruction = `\n\n7. [CRITICAL LANGUAGE TRANSLATION] Translate the entire enhanced prompt (including structural markdown headers like # Role, # Context & Goal, # Specific Checklist Deliverables, # Strict Rules & Constraints, # Desired Output Format) into ${targetLangName}. The user has explicitly requested to work in their native language layouts.`;
        }
        
        // Construct the Meta-Prompt for rewriting
        const metaPrompt = `You are an Elite Prompt Engineer, Senior Systems Architect, and World-Class AI Interaction Designer. Your absolute objective is to take a user's raw, messy, conversational draft thought and compile it into an extremely robust, production-grade, and structured Markdown prompt template.
 
Here is the raw conversational thought:
---
${rawThought}
---
 
You must re-engineer this request into a highly optimized, high-fidelity prompt template following this exact, rigorous structure:

1. **# Role**: Establish an expert persona, domain, and specific mindset tailored to the task (e.g., "Senior React Architect & Web Accessibility Specialist").
2. **# Context & Core Goal**: Provide a clear background, objective, and specific scope of what needs to be achieved.
3. **# Specific Checklist Deliverables**: Break the tasks into a detailed, logically ordered, and numbered checklist.
4. **# Strict Rules & Constraints**: Outline absolute rules, boundaries, and restrictions (e.g., anti-hallucination, edge case handling, performance expectations). You MUST explicitly incorporate these custom shield guardrails:
${guardrailsBlock}
5. **# Desired Output Format**: Define the exact structure, code markers, and presentation formatting requested.
${translationInstruction}

### System Guidelines:
- Double-check for technical accuracy and eliminate all hand-waving or generic placeholder markers.
- Maintain high information density and professional, objective terminology.
- Output ONLY the compiled Markdown prompt block itself. Do NOT include any surrounding conversational text, introduction (e.g. "Here is your enhanced prompt:"), or HTML frames. Deliver raw Markdown directly.`;
 
        // 1. Google Gemini API Call
        if (provider === 'gemini') {
            if (!key) throw new Error('Gemini API key is missing. Go to Settings to configure it.');
            
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: metaPrompt }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.2
                    }
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errMsg = errorData.error?.message || response.statusText || 'Unknown API error';
                throw new Error(`Gemini API Error: ${errMsg}`);
            }
            
            const result = await response.json();
            const enhancedText = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!enhancedText) throw new Error('Gemini API returned an empty response. Try again.');
            return enhancedText.trim();
        }
        
        // 2. OpenAI API Call
        if (provider === 'openai') {
            if (!key) throw new Error('OpenAI API key is missing. Go to Settings to configure it.');
            
            const endpoint = 'https://api.openai.com/v1/chat/completions';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${key}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an Elite Systems Architect and Prompt Engineer. Output raw markdown prompts without conversational preamble.'
                        },
                        {
                            role: 'user',
                            content: metaPrompt
                        }
                    ],
                    temperature: 0.2
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errMsg = errorData.error?.message || response.statusText || 'Unknown API error';
                throw new Error(`OpenAI API Error: ${errMsg}`);
            }
            
            const result = await response.json();
            const enhancedText = result.choices?.[0]?.message?.content;
            if (!enhancedText) throw new Error('OpenAI API returned an empty response. Try again.');
            return enhancedText.trim();
        }
        
        // 3. Fallback: Zero-Key Smart Local Compiler
        return this.localSmartCompile(rawThought, activeShields, targetLang);
    },
    
    // --- Zero-Key Smart Local Compiler ---
    localSmartCompile(rawThought, activeShields, targetLang = 'en') {
        const thought = rawThought.trim();
        
        // Basic classification
        const isCoding = /\b(python|javascript|js|html|css|react|node|api|database|sql|class|function|npm|vsc|code|script|github|server)\b/i.test(thought);
        const isCreative = /\b(copy|blog|social|seo|marketing|story|email|write|book|creative)\b/i.test(thought);
        
        // Multi-language Translation Dictionaries for Headers and Local Prompt Assembly
        const headers = {
            'en': {
                role: '# Role',
                context: '# Context & Goal',
                deliverables: '# Specific Checklist Deliverables',
                rules: '# Strict Rules & Constraints',
                format: '# Desired Output Format',
                personaLabel: 'Expert General Intelligence & Problem Solver',
                personaReact: 'Senior React Architect & UI/UX Specialist',
                personaPython: 'Senior Python Engineer & Automation Specialist',
                personaDb: 'Principal Database Architect',
                personaFullStack: 'Senior Full-Stack Software Engineer & Solutions Architect',
                personaCopywriter: 'Elite Direct-Response Copywriter & CRO Architect',
                personaAcademic: 'Distinguished Academic Professor & Feynman Method Mentor',
                goalText: 'You have been tasked to deliver a perfect, premium solution for the following request:',
                deliverableOne: 'Resolve request:',
                deliverableDefault: 'Complete the core task requested:',
                deliverableInstructions: 'Provide solid test parameters or usage instructions.',
                ruleDeprecated: 'Do NOT use deprecated libraries or outdated syntaxes.',
                rulePayloads: 'Implement comprehensive validation handlers for parameters and API network payloads.',
                ruleTruncation: '[STRICT CONSTRAINT] Do NOT truncate code. You must write every line of code without omitting segments using //... rest of code.',
                ruleComments: '[STRICT CONSTRAINT] Keep existing comments and document newly added systems clearly.',
                rulePlan: '[STRICT CONSTRAINT] Lay out a technical structure plan before providing the refactored code.',
                ruleTailwind: '[STRICT CONSTRAINT] Keep the existing stylesheet structures. Do not force styling framework changes.',
                ruleFiller: 'Avoid superficial filler text; maintain maximum factual density and clear readability.',
                ruleFirstPrinciples: 'Focus on first-principles reasoning and structured explanations.',
                outputMarkdown: 'Output clean, structured Markdown.',
                outputAccuracy: 'Double-check for accuracy and ensure zero placeholders or generic template markers.',
                outputWrap: 'If code is written, wrap blocks in appropriate language markers (e.g., ```python).',
                formatDefault: 'Provide a complete, comprehensive, and ready-to-use solution, concluding with a brief explanation of how it satisfies the core constraints.'
            },
            'es': {
                role: '# Rol',
                context: '# Contexto y Objetivo',
                deliverables: '# Entregables Específicos',
                rules: '# Reglas y Restricciones Estrictas',
                format: '# Formato de Salida Deseado',
                personaLabel: 'Experto en Inteligencia General y Resolución de Problemas',
                personaReact: 'Arquitecto Senior de React y Especialista en UI/UX',
                personaPython: 'Ingeniero Senior de Python y Especialista en Automatización',
                personaDb: 'Arquitecto Principal de Bases de Datos',
                personaFullStack: 'Ingeniero de Software Senior Full-Stack y Arquitecto de Soluciones',
                personaCopywriter: 'Redactor Publicitario de Élite y Arquitecto de CRO',
                personaAcademic: 'Profesor Académico Distinguido y Mentor del Método Feynman',
                goalText: 'Se le ha encomendado ofrecer una solución perfecta y premium para la siguiente solicitud:',
                deliverableOne: 'Resolver solicitud:',
                deliverableDefault: 'Completar la tarea principal solicitada:',
                deliverableInstructions: 'Proporcionar parámetros de prueba sólidos o instrucciones de uso.',
                ruleDeprecated: 'NO utilice bibliotecas obsoletas o sintaxis desactualizadas.',
                rulePayloads: 'Implementar controladores de validación integrales para parámetros y cargas de red de API.',
                ruleTruncation: '[RESTRICCIÓN ESTRICTA] NO trunque el código. Debe escribir cada línea de código sin omitir segmentos usando //... resto del código.',
                ruleComments: '[RESTRICCIÓN ESTRICTA] Conserve los comentarios existentes y documente los sistemas recién agregados con claridad.',
                rulePlan: '[RESTRICCIÓN ESTRICTA] Presente un plan de estructura técnica antes de proporcionar el código refactorizado.',
                ruleTailwind: '[RESTRICCIÓN ESTRICTA] Mantenga las estructuras de hojas de estilo existentes. No fuerce cambios en el framework de estilos.',
                ruleFiller: 'Evite el texto de relleno superficial; mantenga la máxima densidad de hechos y una legibilidad clara.',
                ruleFirstPrinciples: 'Centrarse en el razonamiento de primeros principios y explicaciones estructuradas.',
                outputMarkdown: 'Producir Markdown limpio y estructurado.',
                outputAccuracy: 'Verifique la precisión y asegúrese de que no haya marcadores de posición ni marcadores de plantilla genéricos.',
                outputWrap: 'Si escribe código, envuelva los bloques en marcadores de idioma adecuados (por ejemplo, ```python).',
                formatDefault: 'Proporcione una solución completa, exhaustiva y lista para usar, que concluya con una breve explicación de cómo cumple con las restricciones principales.'
            },
            'fr': {
                role: '# Rôle',
                context: '# Contexte et Objectif',
                deliverables: '# Livrables Spécifiques',
                rules: '# Règles et Contraintes Strictes',
                format: '# Format de Sortie Souhaité',
                personaLabel: 'Expert en Intelligence Générale et Résolution de Problèmes',
                personaReact: 'Architecte React Senior & Spécialiste UI/UX',
                personaPython: 'Ingénieur Python Senior & Spécialiste de l\'Automatisation',
                personaDb: 'Architecte de Base de Données Principal',
                personaFullStack: 'Ingénieur Logiciel Senior Full-Stack & Architecte de Solutions',
                personaCopywriter: 'Concepteur-Rédacteur d\'Élite & Architecte CRO',
                personaAcademic: 'Professeur Académique Distingué & Mentor de la Méthode Feynman',
                goalText: 'Vous avez été chargé de fournir une solution parfaite et premium pour la demande suivante :',
                deliverableOne: 'Résoudre la demande :',
                deliverableDefault: 'Accomplir la tâche principale demandée :',
                deliverableInstructions: 'Fournir des paramètres de test solides ou des instructions d\'utilisation.',
                ruleDeprecated: 'N\'utilisez PAS de bibliothèques obsolètes ou de syntaxes dépassées.',
                rulePayloads: 'Implémenter des gestionnaires de validation complets pour les paramètres et les charges utiles du réseau API.',
                ruleTruncation: '[CONTRAINTE STRICTE] Ne tronquez PAS le code. Vous devez écrire chaque ligne de code sans omettre de segments avec //... le reste du code.',
                ruleComments: '[CONTRAINTE STRICTE] Conserver les commentaires existants et documenter clairement les nouveaux systèmes ajoutés.',
                rulePlan: '[CONTRAINTE STRICTE] Présenter un plan de structure technique avant de fournir le code réfactoré.',
                ruleTailwind: '[CONTRAINTE STRICTE] Conserver les structures de feuilles de style existantes. Ne pas forcer de changement de framework de style.',
                ruleFiller: 'Éviter les textes de remplissage superficiels ; maintenir une densité factuelle maximale et une lisibilité claire.',
                ruleFirstPrinciples: 'Se concentrer sur le raisonnement à partir de principes fondamentaux et sur des explications structurées.',
                outputMarkdown: 'Générer du Markdown propre et structuré.',
                outputAccuracy: 'Double-vérifier l\'exactitude et s\'assurer de l\'absence de placeholders ou de marqueurs de modèles génériques.',
                outputWrap: 'Si du code est écrit, envelopper les blocs dans les marqueurs de langage appropriés (par exemple, ```python).',
                formatDefault: 'Fournir une solution complète, exhaustive et prête à l\'emploi, se terminant par une brève explication de la manière dont elle satisfait aux contraintes principales.'
            },
            'ja': {
                role: '# 役割',
                context: '# 文脈と主要目標',
                deliverables: '# 具体的な成果物チェックリスト',
                rules: '# 厳格なルールと制約事項',
                format: '# 希望する出力形式',
                personaLabel: '汎用人工知能および問題解決のエキスパート',
                personaReact: 'シニアReactアーキテクト＆UI/UXスペシャリスト',
                personaPython: 'シニアPythonエンジニア＆自動化スペシャリスト',
                personaDb: 'プリンシパル データベース アーキテクト',
                personaFullStack: 'シニアフルスタック ソフトウェアエンジニア＆ソリューション アーキテクト',
                personaCopywriter: 'エリート ダイレクトレスポンス コピーライター＆CROアーキテクト',
                personaAcademic: '著名な大学教授＆ファインマン・テクニック メンター',
                goalText: '以下のリクエストに対して、完璧でプレミアムなソリューションを提供する任務が課されました：',
                deliverableOne: 'リクエストを解決する：',
                deliverableDefault: '要求されたコアタスクを完了する：',
                deliverableInstructions: '確実なテストパラメータまたは使用手順を提供すること。',
                ruleDeprecated: '非推奨のライブラリや古い構文は使用しないでください。',
                rulePayloads: 'パラメータおよびAPIネットワークのペイロードに対して、包括的な検証ハンドラを実装すること。',
                ruleTruncation: '【厳格な制約】コードを途中で省略しないでください。//... 残りのコード のように省略せず、すべての行を記述する必要があります。',
                ruleComments: '【厳格な制約】既存のコメントを保持し、新しく追加されたシステムを明確にドキュメント化すること。',
                rulePlan: '【厳格な制約】リファクタリングされたコードを提供する前に、技術的な構造計画を提示すること。',
                ruleTailwind: '【厳格な制約】既存のスタイルシート構造を維持すること。要求されていないスタイリングフレームワークへの変更を強制しないこと。',
                ruleFiller: '表面的なフィラーテキスト（無駄な記述）を避け、情報の密度を最大化し、明確な可読性を維持すること。',
                ruleFirstPrinciples: '第一原理思考に基づく推論と構造化された説明に集中すること。',
                outputMarkdown: 'クリーンで構造化されたMarkdownを出力すること。',
                outputAccuracy: '正確性をダブルチェックし、プレースホルダーや汎用テンプレートマーカーが一切ないことを確認すること。',
                outputWrap: 'コードを記述する場合は、適切な言語マーカー（例：```python）でブロックを囲むこと。',
                formatDefault: '完全で包括的、かつすぐに使用できるソリューションを提供し、それが主要な制約をどのように満たしているかの短い説明で締めくくること。'
            },
            'de': {
                role: '# Rolle',
                context: '# Kontext & Hauptziel',
                deliverables: '# Spezifische Ergebnisse',
                rules: '# Strikte Regeln & Einschränkungen',
                format: '# Gewünschtes Ausgabeformat',
                personaLabel: 'Experte für Allgemeine Intelligenz & Problemlösung',
                personaReact: 'Senior React Architect & UI/UX-Spezialist',
                personaPython: 'Senior Python Engineer & Automatisierungsspezialist',
                personaDb: 'Principal Database Architect',
                personaFullStack: 'Senior Full-Stack Software Engineer & Solutions Architect',
                personaCopywriter: 'Elite Direct-Response Copywriter & CRO-Architect',
                personaAcademic: 'Herausragender Universitätsprofessor & Feynman-Methode-Mentor',
                goalText: 'Sie wurden beauftragt, eine perfekte, erstklassige Lösung für die folgende Anfrage zu liefern:',
                deliverableOne: 'Anfrage lösen:',
                deliverableDefault: 'Erledigen Sie die geforderte Kernaufgabe:',
                deliverableInstructions: 'Stellen Sie solide Testparameter oder Gebrauchsanweisungen bereit.',
                ruleDeprecated: 'Verwenden Sie KEINE veralteten Bibliotheken oder überholten Syntaxen.',
                rulePayloads: 'Implementieren Sie umfassende Validierungshandler für Parameter und API-Netzwerk-Payloads.',
                ruleTruncation: '[STRIKTE EINSCHRÄNKUNG] Code NICHT kürzen. Sie müssen jede Zeile Code schreiben, ohne Abschnitte mit //... restlicher Code auszulassen.',
                ruleComments: '[STRIKTE EINSCHRÄNKUNG] Behalten Sie vorhandene Kommentare bei und dokumentieren Sie neu hinzugefügte Systeme klar.',
                rulePlan: '[STRIKTE EINSCHRÄNKUNG] Legen Sie einen technischen Strukturplan vor, bevor Sie den refaktorierten Code bereitstellen.',
                ruleTailwind: '[STRIKTE EINSCHRÄNKUNG] Behalten Sie die bestehenden Stylesheet-Strukturen bei. Erzwingen Sie keine Änderungen am Styling-Framework.',
                ruleFiller: 'Vermeiden Sie oberflächlichen Fülltext; behalten Sie die maximale Faktendichte und klare Lesbarkeit bei.',
                ruleFirstPrinciples: 'Konzentrieren Sie sich auf Argumentation nach grundlegenden Prinzipien und strukturierte Erklärungen.',
                outputMarkdown: 'Geben Sie sauberes, strukturiertes Markdown aus.',
                outputAccuracy: 'Überprüfen Sie die Richtigkeit und stellen Sie sicher, dass keine Platzhalter oder generischen Vorlagenmarkierungen vorhanden sind.',
                outputWrap: 'Wenn Code geschrieben wird, schließen Sie Blöcke in entsprechende Sprachmarkierungen ein (z. B. ```python).',
                formatDefault: 'Stellen Sie eine vollständige, umfassende und gebrauchsfertige Lösung bereit und schließen Sie mit einer kurzen Erklärung ab, wie sie die wichtigsten Einschränkungen erfüllt.'
            },
            'hi': {
                role: '# भूमिका',
                context: '# संदर्भ और मुख्य लक्ष्य',
                deliverables: '# विशिष्ट डिलिवरेबल्स',
                rules: '# सख्त नियम और सीमाएं',
                format: '# वांछित आउटपुट प्रारूप',
                personaLabel: 'विशेषज्ञ सामान्य बुद्धिमत्ता और समस्या समाधानकर्ता',
                personaReact: 'वरिष्ठ रिएक्ट आर्किटेक्ट और UI/UX विशेषज्ञ',
                personaPython: 'वरिष्ठ पायथन इंजीनियर और स्वचालन विशेषज्ञ',
                personaDb: 'प्रधान डेटाबेस आर्किटेक्ट',
                personaFullStack: 'वरिष्ठ फुल-स्टैक सॉफ्टवेयर इंजीनियर और समाधान आर्किटेक्ट',
                personaCopywriter: 'कुलीन प्रत्यक्ष-प्रतिक्रिया कॉपीराइटर और CRO आर्किटेक्ट',
                personaAcademic: 'प्रतिष्ठित शैक्षणिक प्रोफेसर और फेनमैन पद्धति संरक्षक',
                goalText: 'आपको निम्नलिखित अनुरोध के लिए एक आदर्श, प्रीमियम समाधान प्रदान करने का कार्य सौंपा गया है:',
                deliverableOne: 'अनुरोध का समाधान करें:',
                deliverableDefault: 'अनुरोधित मुख्य कार्य को पूरा करें:',
                deliverableInstructions: 'ठोस परीक्षण पैरामीटर या उपयोग निर्देश प्रदान करें।',
                ruleDeprecated: 'अप्रचलित पुस्तकालयों या पुराने सिंटैक्स का उपयोग न करें।',
                rulePayloads: 'पैरामीटर और API नेटवर्क पेलोड के लिए व्यापक सत्यापन हैंडलर लागू करें।',
                ruleTruncation: '[सख्त प्रतिबंध] कोड को छोटा न करें। आपको //... शेष कोड का उपयोग करके अंशों को छोड़े बिना कोड की प्रत्येक पंक्ति लिखनी होगी।',
                ruleComments: '[सख्त प्रतिबंध] मौजूदा टिप्पणियों को सुरक्षित रखें और नए जोड़े गए सिस्टम को स्पष्ट रूप से प्रलेखित करें।',
                rulePlan: '[सख्त प्रतिबंध] पुनर्गठित कोड प्रदान करने से पहले एक तकनीकी संरचना योजना तैयार करें।',
                ruleTailwind: '[सख्त प्रतिबंध] मौजूदा स्टाइलशीट संरचनाओं को बनाए रखें। अवांछित स्टाइलिंग फ्रेमवर्क परिवर्तनों को लागू न करें।',
                ruleFiller: 'सतही भराव पाठ से बचें; अधिकतम तथ्यात्मक घनत्व और स्पष्ट पठनीयता बनाए रखें।',
                ruleFirstPrinciples: 'प्रथम-सिद्धांतों के तर्क और संरचित स्पष्टीकरण पर ध्यान केंद्रित करें।',
                outputMarkdown: 'साफ, संरचित मार्कडाउन आउटपुट करें।',
                outputAccuracy: 'सटीकता के लिए दोबारा जांचें और सुनिश्चित करें कि शून्य प्लेसहोल्डर या सामान्य टेम्पलेट मार्कर हैं।',
                outputWrap: 'यदि कोड लिखा गया है, तो ब्लॉक को उपयुक्त भाषा मार्करों (जैसे, ```python) में लपेटें।',
                formatDefault: 'एक संपूर्ण, व्यापक और उपयोग के लिए तैयार समाधान प्रदान करें, और एक संक्षिप्त विवरण के साथ समाप्त करें कि यह मुख्य सीमाओं को कैसे पूरा करता है।'
            }
        };
        
        const dict = headers[targetLang] || headers['en'];
        
        // Define Persona
        let persona = dict.personaLabel;
        if (isCoding) {
            // Check specific languages
            if (/\breact\b/i.test(thought)) persona = dict.personaReact;
            else if (/\bpython\b/i.test(thought)) persona = dict.personaPython;
            else if (/\b(sql|database|db)\b/i.test(thought)) persona = dict.personaDb;
            else persona = dict.personaFullStack;
        } else if (isCreative) {
            persona = dict.personaCopywriter;
        } else if (/\b(learn|study|explain|understand|exam|math|physics|science)\b/i.test(thought)) {
            persona = dict.personaAcademic;
        }
        
        // Extract Sentences to formulate tasks
        const sentences = thought.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 5);
        let deliverables = '';
        if (sentences.length > 1) {
            deliverables = sentences.slice(0, 4).map((s, idx) => `${idx + 1}. ${dict.deliverableOne} "${s}."`).join('\n');
        } else {
            deliverables = `1. ${dict.deliverableDefault} "${thought}."\n2. ${dict.deliverableInstructions}`;
        }
        
        // Compile Guardrails
        let constraints = '';
        if (isCoding) {
            constraints += `- ${dict.ruleDeprecated}\n`;
            constraints += `- ${dict.rulePayloads}\n`;
            
            if (activeShields.antiTruncation) constraints += `- ${dict.ruleTruncation}\n`;
            if (activeShields.preserveComments) constraints += `- ${dict.ruleComments}\n`;
            if (activeShields.planFirst) constraints += `- ${dict.rulePlan}\n`;
            if (activeShields.tailwindLock) constraints += `- ${dict.ruleTailwind}\n`;
        } else {
            constraints += `- ${dict.ruleFiller}\n`;
            constraints += `- ${dict.ruleFirstPrinciples}\n`;
        }
        
        // Build Output Prompt Block
        let result = `${dict.role}
${persona}

${dict.context}
${dict.goalText}
> ${thought}

${dict.deliverables}
${deliverables}

${dict.rules}
${constraints}- ${dict.outputMarkdown}
- ${dict.outputAccuracy}
- ${dict.outputWrap}

${dict.format}
${dict.formatDefault}`;

        return result;
    }
};
