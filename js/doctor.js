/* ==========================================================================
   PromptFlow AI - Prompt Doctor Diagnostics Module (doctor.js)
   ========================================================================== */

export const PromptDoctor = {
    
    analyze(promptText) {
        const text = (promptText || '').trim();
        
        // Base Checklist Items
        const checklist = {
            hasRole: false,
            hasConstraints: false,
            hasGoal: false,
            hasFormat: false,
            hasLength: false
        };
        
        if (!text) {
            return {
                score: 0,
                verdict: 'Awaiting Input',
                checklist,
                advice: 'Paste or draft a prompt on the left to begin diagnosing its effectiveness. Premium prompts score above 85.'
            };
        }
        
        const lowerText = text.toLowerCase();
        
        // 1. Role Detection (Persona)
        const rolePatterns = [
            'role', 'persona', 'you are', 'act as', 'specialist', 
            'expert', 'architect', 'developer', 'engineer', 'tutor', 'writer'
        ];
        checklist.hasRole = rolePatterns.some(p => lowerText.includes(p));
        
        // 2. Constraints Detection
        const constraintPatterns = [
            'avoid', 'do not', 'don\'t', 'never', 'rules', 'constraints', 
            'limitations', 'strictly', 'forbid', 'must not', 'guardrails'
        ];
        checklist.hasConstraints = constraintPatterns.some(p => lowerText.includes(p));
        
        // 3. Goal / Context Detection
        const goalPatterns = [
            'goal', 'objective', 'task', 'purpose', 'context', 
            'background', 'scenario', 'trying to', 'to build', 'how to'
        ];
        checklist.hasGoal = goalPatterns.some(p => lowerText.includes(p)) || text.length > 50;
        
        // 4. Output Format Specification Detection
        const formatPatterns = [
            'format', 'output', 'deliverables', 'markdown', 'json', 
            'diff', 'code block', 'bullet list', 'table', 'structure your response'
        ];
        checklist.hasFormat = formatPatterns.some(p => lowerText.includes(p));
        
        // 5. Length Check (Depth/Detail)
        checklist.hasLength = text.length > 180;
        
        // Calculate Score (Up to 100 points)
        let score = 0;
        if (checklist.hasRole) score += 20;
        if (checklist.hasConstraints) score += 20;
        if (checklist.hasGoal) score += 20;
        if (checklist.hasFormat) score += 20;
        
        // Graduated length score
        if (text.length > 250) {
            score += 20;
        } else if (text.length > 100) {
            score += 10;
        } else if (text.length > 30) {
            score += 5;
        }
        
        // Verdict Determination
        let verdict = 'Weak';
        let colorClass = 'danger';
        if (score >= 85) {
            verdict = 'Excellent';
            colorClass = 'healthy';
        } else if (score >= 60) {
            verdict = 'Good';
            colorClass = 'warning';
        } else if (score >= 35) {
            verdict = 'Moderate';
            colorClass = 'warning';
        }
        
        // Dynamic Actionable Advice Generation
        const advicePoints = [];
        if (!checklist.hasRole) {
            advicePoints.push('Inject a clear **Persona/Role** (e.g., "Act as a Senior QA Automation Engineer").');
        }
        if (!checklist.hasGoal) {
            advicePoints.push('Clearly lay out the **Core Goal & Context** of your request.');
        }
        if (!checklist.hasConstraints) {
            advicePoints.push('Establish **Strict Rules & Limitations** on what the AI should *avoid* doing.');
        }
        if (!checklist.hasFormat) {
            advicePoints.push('Provide an explicit **Output Format** standard (e.g., "Output code in a single copy-paste block").');
        }
        if (!checklist.hasLength && text.length < 100) {
            advicePoints.push('Provide more **contextual detail**; short prompts force the AI to make assumptions.');
        }
        
        let adviceText = '';
        if (score >= 85) {
            adviceText = '🏆 **Spectacular Prompt Structure!** Your prompt contains clear guardrails, a defined persona, exact output layouts, and excellent details. Ready for prime-time AI execution.';
        } else {
            adviceText = '💡 **To boost your prompt\'s efficiency:**<br>' + advicePoints.map(p => `• ${p}`).join('<br>');
        }
        
        return {
            score,
            verdict,
            colorClass,
            checklist,
            advice: adviceText
        };
    }
};
