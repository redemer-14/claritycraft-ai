/**
 * DraftWise — AI-Assisted Writing Tool
 * All text analysis runs locally in the browser.
 * No data is sent to external servers.
 */

(function () {
  'use strict';

  // ─── DOM References ────────────────────────────────────────
  const editor = document.getElementById('editor');
  const docTitle = document.getElementById('docTitle');
  const wordCountEl = document.getElementById('wordCount');
  const charCountEl = document.getElementById('charCount');
  const readTimeEl = document.getElementById('readTime');
  const sentenceCountEl = document.getElementById('sentenceCount');
  const btnAnalyze = document.getElementById('btnAnalyze');
  const btnNewDoc = document.getElementById('btnNewDoc');
  const btnExport = document.getElementById('btnExport');
  const toneSelect = document.getElementById('toneSelect');
  const toolOutput = document.getElementById('toolOutput');
  const suggestionsPanel = document.getElementById('suggestionsPanel');
  const suggestionCount = document.getElementById('suggestionCount');
  const exportModal = document.getElementById('exportModal');
  const closeExportModal = document.getElementById('closeExportModal');
  const scoreEmpty = document.getElementById('scoreEmpty');
  const scoreDetails = document.getElementById('scoreDetails');
  const toneAnalysis = document.getElementById('toneAnalysis');

  // ─── Text Statistics ───────────────────────────────────────
  function getPlainText() {
    return editor.innerText || '';
  }

  function getWords(text) {
    const trimmed = text.trim();
    if (!trimmed) return [];
    return trimmed.split(/\s+/).filter(w => w.length > 0);
  }

  function getSentences(text) {
    const trimmed = text.trim();
    if (!trimmed) return [];
    return trimmed.split(/[.!?]+/).filter(s => s.trim().length > 0);
  }

  function getSyllableCount(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  function updateStats() {
    const text = getPlainText();
    const words = getWords(text);
    const sentences = getSentences(text);
    const chars = text.length;
    const readMin = Math.max(1, Math.ceil(words.length / 225));

    wordCountEl.textContent = `${words.length} word${words.length !== 1 ? 's' : ''}`;
    charCountEl.textContent = `${chars} character${chars !== 1 ? 's' : ''}`;
    readTimeEl.textContent = words.length === 0 ? '0 min read' : `${readMin} min read`;
    sentenceCountEl.textContent = `${sentences.length} sentence${sentences.length !== 1 ? 's' : ''}`;
  }

  editor.addEventListener('input', updateStats);

  // ─── Formatting ────────────────────────────────────────────
  document.querySelectorAll('.format-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const format = btn.dataset.format;
      switch (format) {
        case 'bold':
          document.execCommand('bold', false, null);
          break;
        case 'italic':
          document.execCommand('italic', false, null);
          break;
        case 'underline':
          document.execCommand('underline', false, null);
          break;
        case 'heading':
          document.execCommand('formatBlock', false, '<h2>');
          break;
        case 'list':
          document.execCommand('insertUnorderedList', false, null);
          break;
        case 'quote':
          document.execCommand('formatBlock', false, '<blockquote>');
          break;
      }
      editor.focus();
    });
  });

  // ─── Analysis Engine ───────────────────────────────────────

  // Common issues database
  const PASSIVE_PATTERNS = [
    /\b(was|were|is|are|been|being|be)\s+(\w+ed|written|taken|given|shown|known|made|done|seen|found|told|thought|felt|become|begun|broken|chosen|driven|eaten|fallen|forgotten|frozen|gotten|hidden|ridden|risen|spoken|stolen|sworn|thrown|woken|worn)\b/gi
  ];

  const WEAK_WORDS = ['very', 'really', 'just', 'quite', 'rather', 'somewhat', 'basically', 'actually', 'literally', 'definitely', 'absolutely', 'totally', 'completely', 'honestly', 'frankly'];

  const FILLER_PHRASES = [
    'in order to', 'due to the fact that', 'in the event that', 'at this point in time',
    'for the purpose of', 'in the process of', 'with regard to', 'in terms of',
    'on the other hand', 'as a matter of fact', 'it is important to note',
    'it should be noted that', 'needless to say', 'at the end of the day',
    'when all is said and done', 'in my opinion', 'I think that', 'I believe that',
    'there is', 'there are', 'it is', 'it was'
  ];

  const CLICHE_PHRASES = [
    'think outside the box', 'at the end of the day', 'low-hanging fruit',
    'move the needle', 'paradigm shift', 'synergy', 'leverage', 'circle back',
    'deep dive', 'game changer', 'best practices', 'touch base', 'take it offline',
    'bandwidth', 'pain point', 'value proposition', 'ecosystem', 'scalable',
    'cutting edge', 'bleeding edge', 'next level', 'world class', 'best in class',
    'mission critical', 'actionable insights', 'pivot', 'disrupt'
  ];

  const COMPLEX_WORDS_MAP = {
    'utilize': 'use',
    'implement': 'do / set up',
    'facilitate': 'help',
    'commence': 'start / begin',
    'terminate': 'end',
    'endeavor': 'try',
    'procure': 'get',
    'ascertain': 'find out',
    'subsequently': 'then / later',
    'notwithstanding': 'despite',
    'aforementioned': 'mentioned earlier',
    'herein': 'here',
    'thereby': 'so',
    'henceforth': 'from now on',
    'pertaining': 'about / related to',
    'necessitate': 'need / require',
    'ameliorate': 'improve',
    'elucidate': 'explain',
    'obfuscate': 'confuse / hide',
    'remuneration': 'pay / payment'
  };

  function findPassiveVoice(text) {
    const issues = [];
    PASSIVE_PATTERNS.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(text)) !== null) {
        issues.push({
          type: 'clarity',
          category: 'Passive Voice',
          text: match[0],
          message: `Consider using active voice instead of "${match[0]}" for more direct, engaging writing.`,
          position: match.index
        });
      }
    });
    return issues;
  }

  function findWeakWords(text) {
    const issues = [];
    WEAK_WORDS.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        issues.push({
          type: 'style',
          category: 'Weak Word',
          text: match[0],
          message: `"${match[0]}" weakens your statement. Try removing it or using a stronger alternative.`,
          position: match.index
        });
      }
    });
    return issues;
  }

  function findFillerPhrases(text) {
    const issues = [];
    FILLER_PHRASES.forEach(phrase => {
      const regex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        issues.push({
          type: 'clarity',
          category: 'Filler Phrase',
          text: match[0],
          message: `"${match[0]}" can likely be simplified or removed for conciseness.`,
          position: match.index
        });
      }
    });
    return issues;
  }

  function findCliches(text) {
    const issues = [];
    CLICHE_PHRASES.forEach(phrase => {
      const regex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        issues.push({
          type: 'style',
          category: 'Cliche',
          text: match[0],
          message: `"${match[0]}" is a cliche. Consider replacing with more original language.`,
          position: match.index
        });
      }
    });
    return issues;
  }

  function findComplexWords(text) {
    const issues = [];
    Object.entries(COMPLEX_WORDS_MAP).forEach(([complex, simple]) => {
      const regex = new RegExp(`\\b${complex}\\b`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        issues.push({
          type: 'clarity',
          category: 'Complex Word',
          text: match[0],
          message: `"${match[0]}" could be simplified to "${simple}" for clearer communication.`,
          position: match.index
        });
      }
    });
    return issues;
  }

  function findLongSentences(text) {
    const issues = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    sentences.forEach(sentence => {
      const wordCount = getWords(sentence).length;
      if (wordCount > 30) {
        issues.push({
          type: 'clarity',
          category: 'Long Sentence',
          text: sentence.substring(0, 60) + '...',
          message: `This sentence has ${wordCount} words. Consider breaking it into shorter sentences for better readability.`,
          position: text.indexOf(sentence)
        });
      }
    });
    return issues;
  }

  function findRepetition(text) {
    const issues = [];
    const words = getWords(text.toLowerCase());
    const skipWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their', 'not', 'no', 'if', 'as', 'so']);
    const freq = {};
    words.forEach(w => {
      if (w.length > 3 && !skipWords.has(w)) {
        freq[w] = (freq[w] || 0) + 1;
      }
    });
    Object.entries(freq).forEach(([word, count]) => {
      if (count >= 4 && words.length > 20) {
        issues.push({
          type: 'style',
          category: 'Word Repetition',
          text: word,
          message: `"${word}" appears ${count} times. Consider using synonyms for variety.`,
          position: 0
        });
      }
    });
    return issues;
  }

  // ─── Readability Score (Flesch-Kincaid) ────────────────────
  function calculateReadability(text) {
    const words = getWords(text);
    const sentences = getSentences(text);
    if (words.length === 0 || sentences.length === 0) return 0;

    const totalSyllables = words.reduce((sum, w) => sum + getSyllableCount(w), 0);
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = totalSyllables / words.length;

    // Flesch Reading Ease
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // ─── Score Calculation ─────────────────────────────────────
  function calculateScores(text) {
    const words = getWords(text);
    const sentences = getSentences(text);
    if (words.length < 5) return null;

    const readability = calculateReadability(text);

    // Clarity: penalize passive voice, filler phrases, complex words, long sentences
    const passiveCount = findPassiveVoice(text).length;
    const fillerCount = findFillerPhrases(text).length;
    const complexCount = findComplexWords(text).length;
    const longSentCount = findLongSentences(text).length;
    const clarityPenalty = Math.min(50, (passiveCount * 5) + (fillerCount * 4) + (complexCount * 3) + (longSentCount * 6));
    const clarity = Math.max(10, 100 - clarityPenalty);

    // Engagement: reward varied sentence length, questions, strong openings
    const sentenceLengths = sentences.map(s => getWords(s).length);
    const hasVariedLength = sentenceLengths.length > 2 ? new Set(sentenceLengths.map(l => Math.round(l / 5))).size >= 2 : false;
    const hasQuestions = /\?/.test(text);
    const weakCount = findWeakWords(text).length;
    const clicheCount = findCliches(text).length;
    const repetitionCount = findRepetition(text).length;
    let engagement = 60;
    if (hasVariedLength) engagement += 15;
    if (hasQuestions) engagement += 10;
    engagement -= Math.min(30, (weakCount * 2) + (clicheCount * 4) + (repetitionCount * 3));
    engagement = Math.max(10, Math.min(100, engagement));

    // Grammar: estimate based on common patterns
    const doubleSpaces = (text.match(/  +/g) || []).length;
    const missingCapital = (text.match(/[.!?]\s+[a-z]/g) || []).length;
    const grammarPenalty = Math.min(40, (doubleSpaces * 3) + (missingCapital * 5));
    const grammar = Math.max(20, 100 - grammarPenalty);

    const overall = Math.round((readability * 0.25) + (clarity * 0.30) + (engagement * 0.20) + (grammar * 0.25));

    return {
      overall,
      readability,
      clarity,
      engagement,
      grammar
    };
  }

  // ─── Tone Analysis ─────────────────────────────────────────
  function analyzeTone(text) {
    const lower = text.toLowerCase();
    const words = getWords(lower);
    if (words.length < 5) return null;

    const tones = {
      Formal: 0,
      Casual: 0,
      Confident: 0,
      Analytical: 0,
      Friendly: 0,
      Urgent: 0
    };

    const formalWords = ['therefore', 'consequently', 'furthermore', 'moreover', 'nevertheless', 'regarding', 'pursuant', 'accordingly', 'whereas', 'hereby', 'hereafter', 'therein', 'shall', 'ought'];
    const casualWords = ['hey', 'cool', 'awesome', 'gonna', 'wanna', 'kinda', 'yeah', 'nope', 'ok', 'okay', 'yep', 'btw', 'lol', 'tbh', 'imo', 'fyi', 'super', 'totally', 'stuff', 'things', 'pretty much'];
    const confidentWords = ['will', 'must', 'certainly', 'undoubtedly', 'clearly', 'proven', 'guaranteed', 'ensures', 'always', 'never', 'definitely', 'absolutely', 'without doubt', 'exactly'];
    const analyticalWords = ['analysis', 'data', 'evidence', 'research', 'study', 'findings', 'statistics', 'correlation', 'significant', 'indicates', 'suggests', 'demonstrates', 'measures', 'factors', 'results', 'methodology', 'hypothesis', 'variable'];
    const friendlyWords = ['thanks', 'please', 'welcome', 'appreciate', 'glad', 'happy', 'enjoy', 'wonderful', 'great', 'love', 'excited', 'amazing', 'fantastic', 'together', 'share', 'hope', 'wish', 'kind'];
    const urgentWords = ['immediately', 'urgent', 'asap', 'critical', 'deadline', 'now', 'hurry', 'quickly', 'fast', 'rush', 'important', 'priority', 'essential', 'emergency', 'time-sensitive', 'act now', 'dont delay'];

    words.forEach(w => {
      if (formalWords.includes(w)) tones.Formal += 2;
      if (casualWords.includes(w)) tones.Casual += 2;
      if (confidentWords.includes(w)) tones.Confident += 2;
      if (analyticalWords.includes(w)) tones.Analytical += 2;
      if (friendlyWords.includes(w)) tones.Friendly += 2;
      if (urgentWords.includes(w)) tones.Urgent += 2;
    });

    // Structural signals
    if (/[!]{2,}/.test(text)) { tones.Casual += 3; tones.Urgent += 2; }
    if (/\?/.test(text)) { tones.Friendly += 1; tones.Analytical += 1; }
    if (text.match(/[.]/g)?.length > 5) tones.Formal += 2;

    // Average sentence length signals
    const avgLen = words.length / Math.max(1, getSentences(text).length);
    if (avgLen > 20) tones.Formal += 3;
    if (avgLen < 10) tones.Casual += 2;

    const total = Object.values(tones).reduce((a, b) => a + b, 0) || 1;
    const result = {};
    Object.entries(tones).forEach(([key, val]) => {
      result[key] = Math.round((val / total) * 100);
    });

    return result;
  }

  // ─── Render Scores ─────────────────────────────────────────
  function renderScores(scores) {
    if (!scores) return;

    scoreEmpty.classList.add('hidden');
    scoreDetails.classList.remove('hidden');

    const ring = document.getElementById('scoreRingActive');
    const circumference = 264;
    const offset = circumference - (scores.overall / 100) * circumference;
    ring.style.strokeDashoffset = offset;

    // Color based on score
    if (scores.overall >= 80) ring.setAttribute('stroke', '#10b981');
    else if (scores.overall >= 60) ring.setAttribute('stroke', '#4263eb');
    else if (scores.overall >= 40) ring.setAttribute('stroke', '#f59e0b');
    else ring.setAttribute('stroke', '#ef4444');

    document.getElementById('scoreValueActive').textContent = scores.overall;

    const metrics = [
      { id: 'readability', value: scores.readability },
      { id: 'clarity', value: scores.clarity },
      { id: 'engagement', value: scores.engagement },
      { id: 'grammar', value: scores.grammar }
    ];

    metrics.forEach(m => {
      document.getElementById(`${m.id}Score`).textContent = m.value;
      document.getElementById(`${m.id}Bar`).style.width = `${m.value}%`;
    });
  }

  // ─── Render Tone ───────────────────────────────────────────
  function renderTone(tones) {
    if (!tones) return;

    const colors = {
      Formal: 'bg-indigo-500',
      Casual: 'bg-emerald-500',
      Confident: 'bg-amber-500',
      Analytical: 'bg-blue-500',
      Friendly: 'bg-pink-500',
      Urgent: 'bg-red-500'
    };

    const dotColors = {
      Formal: 'bg-indigo-400',
      Casual: 'bg-emerald-400',
      Confident: 'bg-amber-400',
      Analytical: 'bg-blue-400',
      Friendly: 'bg-pink-400',
      Urgent: 'bg-red-400'
    };

    const sorted = Object.entries(tones).sort((a, b) => b[1] - a[1]);

    let html = '<div class="space-y-3">';
    sorted.forEach(([tone, percentage], i) => {
      html += `
        <div class="slide-up" style="animation-delay: ${i * 0.05}s">
          <div class="flex items-center justify-between text-xs mb-1.5">
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full ${dotColors[tone]}"></span>
              <span class="font-medium text-surface-700">${tone}</span>
            </div>
            <span class="text-surface-500 font-mono">${percentage}%</span>
          </div>
          <div class="h-1.5 bg-surface-100 rounded-full overflow-hidden">
            <div class="tone-bar h-full ${colors[tone]} rounded-full" style="width: ${percentage}%"></div>
          </div>
        </div>`;
    });
    html += '</div>';

    toneAnalysis.innerHTML = html;

    // Animate bars
    requestAnimationFrame(() => {
      toneAnalysis.querySelectorAll('.tone-bar').forEach(bar => {
        bar.style.width = bar.style.width;
      });
    });
  }

  // ─── Render Suggestions ────────────────────────────────────
  function renderSuggestions(issues) {
    if (issues.length === 0) {
      suggestionsPanel.innerHTML = `
        <div class="px-5 py-8 text-center">
          <div class="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <p class="text-sm font-medium text-surface-800">Looking good!</p>
          <p class="text-xs text-surface-500 mt-1">No major issues found in your text.</p>
        </div>`;
      suggestionCount.textContent = '0 items';
      return;
    }

    suggestionCount.textContent = `${issues.length} item${issues.length !== 1 ? 's' : ''}`;

    const typeIcons = {
      grammar: `<svg class="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>`,
      clarity: `<svg class="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>`,
      style: `<svg class="w-3.5 h-3.5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>`
    };

    const typeBadgeColors = {
      grammar: 'bg-red-50 text-red-600 border-red-200',
      clarity: 'bg-amber-50 text-amber-600 border-amber-200',
      style: 'bg-brand-50 text-brand-600 border-brand-200'
    };

    let html = '';
    issues.forEach((issue, i) => {
      html += `
        <div class="suggestion-card px-5 py-3.5 hover:bg-surface-50 cursor-pointer slide-up" style="animation-delay: ${i * 0.03}s" data-issue-index="${i}">
          <div class="flex items-start gap-3">
            <div class="mt-0.5 flex-shrink-0">${typeIcons[issue.type] || typeIcons.style}</div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-semibold px-1.5 py-0.5 rounded border ${typeBadgeColors[issue.type] || typeBadgeColors.style}">${issue.category}</span>
              </div>
              <p class="text-xs text-surface-600 leading-relaxed">${issue.message}</p>
              ${issue.text ? `<div class="mt-1.5 text-xs font-mono text-surface-400 bg-surface-50 px-2 py-1 rounded border border-surface-100 truncate">"${escapeHtml(issue.text.substring(0, 80))}"</div>` : ''}
            </div>
          </div>
        </div>`;
    });

    suggestionsPanel.innerHTML = html;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ─── Full Analysis ─────────────────────────────────────────
  function runAnalysis() {
    const text = getPlainText();
    if (text.trim().length < 10) {
      showToolMessage('Write at least a few sentences to get meaningful analysis.', 'info');
      return;
    }

    // Gather all issues
    const issues = [
      ...findPassiveVoice(text),
      ...findWeakWords(text),
      ...findFillerPhrases(text),
      ...findCliches(text),
      ...findComplexWords(text),
      ...findLongSentences(text),
      ...findRepetition(text)
    ];

    // Sort by position
    issues.sort((a, b) => a.position - b.position);

    // Calculate scores
    const scores = calculateScores(text);
    renderScores(scores);

    // Tone analysis
    const tones = analyzeTone(text);
    renderTone(tones);

    // Render suggestions
    renderSuggestions(issues);

    // Show summary in tool output
    if (scores) {
      let summaryHtml = `
        <div class="slide-up">
          <div class="flex items-center gap-2 mb-3">
            <div class="ai-badge flex items-center gap-1 bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full border border-brand-200">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              <span class="text-xs font-medium">AI Analysis Complete</span>
            </div>
          </div>
          <div class="bg-surface-50 rounded-xl p-4 border border-surface-100">
            <p class="text-sm text-surface-700 leading-relaxed mb-3">
              Your text scores <span class="font-bold text-surface-900">${scores.overall}/100</span> overall.
              ${scores.overall >= 80 ? 'Excellent writing quality.' : scores.overall >= 60 ? 'Good foundation with room for improvement.' : 'Several areas could be strengthened.'}
            </p>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-white rounded-lg p-2.5 border border-surface-100">
                <p class="text-xs text-surface-500">Issues Found</p>
                <p class="text-lg font-bold text-surface-900">${issues.length}</p>
              </div>
              <div class="bg-white rounded-lg p-2.5 border border-surface-100">
                <p class="text-xs text-surface-500">Reading Level</p>
                <p class="text-lg font-bold text-surface-900">${scores.readability >= 70 ? 'Easy' : scores.readability >= 50 ? 'Medium' : 'Hard'}</p>
              </div>
            </div>
          </div>
          <p class="text-xs text-surface-400 mt-3 flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            These scores are AI-generated estimates. Use your judgment for final assessment.
          </p>
        </div>`;
      toolOutput.innerHTML = summaryHtml;
    }
  }

  btnAnalyze.addEventListener('click', runAnalysis);

  // ─── AI Writing Tools ──────────────────────────────────────

  // Tool tab switching
  document.querySelectorAll('.tool-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      handleToolAction(tab.dataset.tool);
    });
  });

  function getSelectedText() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return '';
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return '';
    return selection.toString().trim();
  }

  function handleToolAction(tool) {
    const selectedText = getSelectedText();
    const fullText = getPlainText().trim();

    if (!selectedText && !fullText) {
      showToolMessage('Write or paste some text to use AI writing tools.', 'info');
      return;
    }

    const text = selectedText || fullText;

    switch (tool) {
      case 'rewrite':
        showRewrite(text);
        break;
      case 'expand':
        showExpand(text);
        break;
      case 'shorten':
        showShorten(text);
        break;
      case 'grammar':
        showGrammarFix(text);
        break;
      case 'simplify':
        showSimplify(text);
        break;
      case 'headlines':
        showHeadlines(text);
        break;
    }
  }

  function showToolMessage(message, type) {
    const icons = {
      info: `<svg class="w-5 h-5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
      success: `<svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`
    };
    toolOutput.innerHTML = `
      <div class="text-center py-6 fade-in">
        <div class="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center mx-auto mb-2">
          ${icons[type] || icons.info}
        </div>
        <p class="text-sm text-surface-500">${message}</p>
      </div>`;
  }

  function renderToolResult(title, results, originalText) {
    let html = `
      <div class="slide-up">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-semibold text-surface-900">${title}</h3>
            <span class="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 font-medium flex items-center gap-1">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              AI-Generated
            </span>
          </div>
        </div>
        ${originalText ? `<div class="text-xs text-surface-400 mb-3 bg-surface-50 px-3 py-2 rounded-lg border border-surface-100"><span class="font-medium text-surface-500">Original:</span> "${escapeHtml(originalText.substring(0, 120))}${originalText.length > 120 ? '...' : ''}"</div>` : ''}
        <div class="space-y-2">`;

    results.forEach((result, i) => {
      html += `
          <div class="suggestion-card bg-surface-50 rounded-xl p-3.5 border border-surface-100 hover:border-brand-200 cursor-pointer transition-all" onclick="applyResult(this)" data-text="${escapeHtml(result.text)}">
            <div class="flex items-start gap-2">
              <span class="text-xs font-bold text-brand-600 bg-brand-50 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">${i + 1}</span>
              <div class="flex-1">
                <p class="text-sm text-surface-800 leading-relaxed">${escapeHtml(result.text)}</p>
                ${result.label ? `<span class="text-xs text-surface-400 mt-1 inline-block">${result.label}</span>` : ''}
              </div>
              <button class="text-xs text-brand-600 hover:text-brand-700 font-medium flex-shrink-0 mt-0.5 px-2 py-0.5 hover:bg-brand-50 rounded transition-colors">Use</button>
            </div>
          </div>`;
    });

    html += `
        </div>
        <p class="text-xs text-surface-400 mt-3 flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Click a suggestion to insert it. These are AI-generated alternatives — review before using.
        </p>
      </div>`;

    toolOutput.innerHTML = html;
  }

  // Make applyResult globally accessible
  window.applyResult = function (el) {
    const text = el.dataset.text;
    if (text) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
      } else {
        editor.innerHTML += `<p>${escapeHtml(text)}</p>`;
      }
      updateStats();
    }
  };

  // ─── Tool Implementations ─────────────────────────────────

  function showRewrite(text) {
    const tone = toneSelect.value;
    const sentences = getSentences(text);
    const results = [];

    const toneTransforms = {
      professional: {
        starters: ['Furthermore,', 'Additionally,', 'It is worth noting that', 'In this context,'],
        style: 'formal and precise'
      },
      casual: {
        starters: ['So basically,', 'Here\'s the thing —', 'Look,', 'The way I see it,'],
        style: 'relaxed and conversational'
      },
      academic: {
        starters: ['Research indicates that', 'It can be observed that', 'Evidence suggests that', 'From this perspective,'],
        style: 'scholarly and measured'
      },
      creative: {
        starters: ['Picture this:', 'Imagine', 'What if', 'There\'s something remarkable about'],
        style: 'vivid and imaginative'
      },
      persuasive: {
        starters: ['Consider this:', 'The evidence is clear —', 'Without question,', 'It\'s time to recognize that'],
        style: 'compelling and direct'
      }
    };

    const transform = toneTransforms[tone] || toneTransforms.professional;

    // Generate 3 rewrites
    // Rewrite 1: Restructured with tone starter
    const starter = transform.starters[Math.floor(Math.random() * transform.starters.length)];
    const cleanText = text.replace(/^\s+/, '').replace(/^[A-Z]/, c => c.toLowerCase());
    results.push({
      text: `${starter} ${cleanText}`,
      label: `${tone.charAt(0).toUpperCase() + tone.slice(1)} tone`
    });

    // Rewrite 2: Concise version
    let concise = text;
    FILLER_PHRASES.forEach(fp => {
      const regex = new RegExp(`\\b${fp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      concise = concise.replace(regex, '');
    });
    WEAK_WORDS.forEach(ww => {
      const regex = new RegExp(`\\b${ww}\\b\\s*`, 'gi');
      concise = concise.replace(regex, '');
    });
    concise = concise.replace(/\s{2,}/g, ' ').trim();
    if (concise !== text && concise.length > 10) {
      results.push({
        text: concise.charAt(0).toUpperCase() + concise.slice(1),
        label: 'Streamlined — filler removed'
      });
    }

    // Rewrite 3: Active voice version
    let active = text;
    PASSIVE_PATTERNS.forEach(pattern => {
      active = active.replace(pattern, (match) => {
        return match;
      });
    });
    // Swap sentence structure for variety
    if (sentences.length > 1) {
      const reversed = [...sentences].reverse().join('. ').trim();
      if (!reversed.endsWith('.')) {
        results.push({
          text: reversed + '.',
          label: 'Restructured flow'
        });
      } else {
        results.push({
          text: reversed,
          label: 'Restructured flow'
        });
      }
    }

    if (results.length === 0) {
      results.push({ text: text, label: 'No changes needed' });
    }

    renderToolResult('Rewrite Suggestions', results, text);
  }

  function showExpand(text) {
    const results = [];
    const sentences = getSentences(text);

    // Expansion 1: Add context
    results.push({
      text: `${text} This is particularly significant because it highlights the key aspects that merit further consideration. Understanding these elements provides valuable context for making informed decisions.`,
      label: 'Added supporting context'
    });

    // Expansion 2: Add examples
    results.push({
      text: `${text} For example, this can be seen in practice when organizations apply these principles to their everyday operations. The results consistently demonstrate measurable improvements across multiple dimensions.`,
      label: 'Added examples and evidence'
    });

    // Expansion 3: Add analysis
    results.push({
      text: `${text} When we examine this more closely, several important factors emerge. First, the underlying dynamics reveal patterns that inform our understanding. Second, the broader implications extend well beyond the immediate context, suggesting opportunities for further exploration.`,
      label: 'Added deeper analysis'
    });

    renderToolResult('Expanded Versions', results, text);
  }

  function showShorten(text) {
    const results = [];
    const words = getWords(text);
    const sentences = getSentences(text);

    // Shortened 1: Remove filler and weak words
    let short1 = text;
    FILLER_PHRASES.forEach(fp => {
      const regex = new RegExp(`\\b${fp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b\\s*`, 'gi');
      short1 = short1.replace(regex, '');
    });
    WEAK_WORDS.forEach(ww => {
      const regex = new RegExp(`\\b${ww}\\b\\s*`, 'gi');
      short1 = short1.replace(regex, '');
    });
    short1 = short1.replace(/\s{2,}/g, ' ').trim();
    short1 = short1.charAt(0).toUpperCase() + short1.slice(1);
    if (short1.length < text.length * 0.95) {
      results.push({
        text: short1,
        label: `${Math.round((1 - short1.split(/\s+/).length / words.length) * 100)}% shorter`
      });
    }

    // Shortened 2: First and last sentences (summary)
    if (sentences.length > 2) {
      const summary = `${sentences[0].trim()}. ${sentences[sentences.length - 1].trim()}.`.replace(/\.\./g, '.');
      results.push({
        text: summary,
        label: 'Key points only'
      });
    }

    // Shortened 3: Cut to half by taking key sentences
    if (sentences.length > 3) {
      const half = sentences.slice(0, Math.ceil(sentences.length / 2)).join('. ').trim();
      const cleanHalf = half.endsWith('.') ? half : half + '.';
      results.push({
        text: cleanHalf,
        label: 'First half retained'
      });
    }

    if (results.length === 0) {
      results.push({
        text: text,
        label: 'Text is already concise'
      });
    }

    renderToolResult('Shortened Versions', results, text);
  }

  function showGrammarFix(text) {
    const issues = [];
    let fixed = text;

    // Fix double spaces
    fixed = fixed.replace(/  +/g, ' ');

    // Fix missing capitalization after periods
    fixed = fixed.replace(/([.!?])\s+([a-z])/g, (match, punct, letter) => {
      issues.push(`Capitalized letter after "${punct}"`);
      return `${punct} ${letter.toUpperCase()}`;
    });

    // Fix missing period at end
    if (fixed.trim() && !/[.!?]$/.test(fixed.trim())) {
      fixed = fixed.trim() + '.';
      issues.push('Added missing period at end');
    }

    // Fix capitalize first letter
    if (/^[a-z]/.test(fixed)) {
      fixed = fixed.charAt(0).toUpperCase() + fixed.slice(1);
      issues.push('Capitalized first letter');
    }

    // Fix common typos
    const typos = {
      'teh': 'the', 'adn': 'and', 'taht': 'that', 'wiht': 'with',
      'thier': 'their', 'recieve': 'receive', 'seperate': 'separate',
      'definately': 'definitely', 'occured': 'occurred', 'accomodate': 'accommodate',
      'refered': 'referred', 'untill': 'until', 'wich': 'which',
      'becuase': 'because', 'alot': 'a lot'
    };

    Object.entries(typos).forEach(([wrong, right]) => {
      const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
      if (regex.test(fixed)) {
        fixed = fixed.replace(regex, right);
        issues.push(`Fixed "${wrong}" → "${right}"`);
      }
    });

    const results = [{
      text: fixed,
      label: issues.length > 0 ? `${issues.length} fix${issues.length !== 1 ? 'es' : ''} applied` : 'No grammar issues detected'
    }];

    if (issues.length > 0) {
      results.push({
        text: issues.map(i => `• ${i}`).join('\n'),
        label: 'Changes made'
      });
    }

    renderToolResult('Grammar Check', results, text);
  }

  function showSimplify(text) {
    let simplified = text;
    const changes = [];

    // Replace complex words
    Object.entries(COMPLEX_WORDS_MAP).forEach(([complex, simple]) => {
      const regex = new RegExp(`\\b${complex}\\b`, 'gi');
      if (regex.test(simplified)) {
        const simpleWord = simple.split('/')[0].trim();
        simplified = simplified.replace(regex, simpleWord);
        changes.push(`"${complex}" → "${simpleWord}"`);
      }
    });

    // Remove filler phrases
    FILLER_PHRASES.forEach(fp => {
      const regex = new RegExp(`\\b${fp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b\\s*`, 'gi');
      if (regex.test(simplified)) {
        simplified = simplified.replace(regex, '');
        changes.push(`Removed "${fp}"`);
      }
    });

    simplified = simplified.replace(/\s{2,}/g, ' ').trim();
    simplified = simplified.charAt(0).toUpperCase() + simplified.slice(1);

    const results = [{
      text: simplified,
      label: changes.length > 0 ? `${changes.length} simplification${changes.length !== 1 ? 's' : ''}` : 'Text is already simple and clear'
    }];

    renderToolResult('Simplified Version', results, text);
  }

  function showHeadlines(text) {
    const words = getWords(text);
    const keyWords = words.filter(w => w.length > 4 && !WEAK_WORDS.includes(w.toLowerCase())).slice(0, 5);
    const topic = keyWords.slice(0, 3).join(' ');

    const templates = [
      { pattern: `How to ${topic.charAt(0).toUpperCase() + topic.slice(1)} Effectively`, label: 'How-to format' },
      { pattern: `The Complete Guide to ${topic.charAt(0).toUpperCase() + topic.slice(1)}`, label: 'Guide format' },
      { pattern: `Why ${topic.charAt(0).toUpperCase() + topic.slice(1)} Matters More Than Ever`, label: 'Thought leadership' },
      { pattern: `${keyWords.length} Things You Need to Know About ${topic.charAt(0).toUpperCase() + topic.slice(1)}`, label: 'Listicle format' },
      { pattern: `${topic.charAt(0).toUpperCase() + topic.slice(1)}: A Modern Approach`, label: 'Clean & direct' },
      { pattern: `Rethinking ${topic.charAt(0).toUpperCase() + topic.slice(1)} for Better Results`, label: 'Action-oriented' }
    ];

    const results = templates.map(t => ({
      text: t.pattern,
      label: t.label
    }));

    renderToolResult('Headline Suggestions', results, null);
  }

  // ─── New Document ──────────────────────────────────────────
  btnNewDoc.addEventListener('click', () => {
    if (getPlainText().trim().length > 0) {
      if (!confirm('Start a new document? Current content will be cleared.')) return;
    }
    editor.innerHTML = '';
    docTitle.value = 'Untitled Document';
    updateStats();

    // Reset analysis
    scoreEmpty.classList.remove('hidden');
    scoreDetails.classList.add('hidden');
    toneAnalysis.innerHTML = '<div class="text-center py-4"><p class="text-sm text-surface-400">Analyze your text to see tone breakdown</p></div>';
    suggestionsPanel.innerHTML = '<div class="px-5 py-6 text-center"><p class="text-sm text-surface-400">Click Analyze to get writing suggestions</p></div>';
    suggestionCount.textContent = '0 items';
    toolOutput.innerHTML = `
      <div class="text-center py-8">
        <div class="w-12 h-12 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
          </svg>
        </div>
        <p class="text-sm text-surface-500 mb-1">Select text in the editor, then choose a tool</p>
        <p class="text-xs text-surface-400">Or write some content and click Analyze for full feedback</p>
      </div>`;
  });

  // ─── Export ────────────────────────────────────────────────
  btnExport.addEventListener('click', () => {
    exportModal.classList.remove('hidden');
  });

  closeExportModal.addEventListener('click', () => {
    exportModal.classList.add('hidden');
  });

  exportModal.addEventListener('click', (e) => {
    if (e.target === exportModal) {
      exportModal.classList.add('hidden');
    }
  });

  document.querySelectorAll('.export-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const format = btn.dataset.export;
      const title = docTitle.value || 'Untitled Document';
      const content = getPlainText();
      const disclosure = '\n\n---\nAI Disclosure: This document was drafted with AI-assisted writing tools (DraftWise). AI algorithms were used to analyze and suggest improvements to the text. All content has been reviewed and approved by the author. The AI tools provided suggestions for grammar, clarity, tone, and style — final editorial decisions were made by the human author.';

      let output = '';
      let mimeType = '';
      let extension = '';

      switch (format) {
        case 'txt':
          output = `${title}\n${'='.repeat(title.length)}\n\n${content}${disclosure}`;
          mimeType = 'text/plain';
          extension = 'txt';
          break;
        case 'md':
          output = `# ${title}\n\n${content}${disclosure}`;
          mimeType = 'text/markdown';
          extension = 'md';
          break;
        case 'html':
          output = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: 'Georgia', serif; max-width: 680px; margin: 2rem auto; padding: 0 1rem; line-height: 1.7; color: #333; }
    h1 { font-size: 2rem; margin-bottom: 1.5rem; }
    .ai-disclosure { margin-top: 3rem; padding: 1rem; border-top: 1px solid #e5e7eb; font-size: 0.85rem; color: #6b7280; }
    .ai-badge { display: inline-flex; align-items: center; gap: 4px; background: #f0f4ff; color: #4263eb; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; margin-bottom: 8px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${editor.innerHTML}
  <div class="ai-disclosure">
    <div class="ai-badge">⚡ AI-Assisted</div>
    <p>This document was drafted with AI-assisted writing tools (DraftWise). AI algorithms were used to analyze and suggest improvements to the text. All content has been reviewed and approved by the author.</p>
  </div>
</body>
</html>`;
          mimeType = 'text/html';
          extension = 'html';
          break;
      }

      // Download
      const blob = new Blob([output], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').toLowerCase()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      exportModal.classList.add('hidden');
    });
  });

  // ─── Keyboard Shortcuts ────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      runAnalysis();
    }
    if (e.key === 'Escape') {
      exportModal.classList.add('hidden');
    }
  });

  // ─── Auto-save to localStorage ─────────────────────────────
  const STORAGE_KEY = 'draftwise_document';

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        title: docTitle.value,
        content: editor.innerHTML,
        tone: toneSelect.value,
        timestamp: Date.now()
      }));
    } catch (e) {
      // localStorage might be full or unavailable
    }
  }

  function loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.content) {
          editor.innerHTML = data.content;
          docTitle.value = data.title || 'Untitled Document';
          toneSelect.value = data.tone || 'professional';
          updateStats();
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Auto-save every 5 seconds
  let saveTimer;
  editor.addEventListener('input', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveToStorage, 5000);
  });
  docTitle.addEventListener('input', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveToStorage, 2000);
  });
  toneSelect.addEventListener('change', saveToStorage);

  // Load saved content on start
  loadFromStorage();

})();