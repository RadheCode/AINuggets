UPDATE stories
SET
  summary = replace(summary, '\n', char(10)),
  summary_detailed = replace(summary_detailed, '\n', char(10))
WHERE edition_id = (SELECT id FROM editions WHERE edition_date = '2026-08-24')
  AND story_key IN (
    'ai-futures-openai',
    'google-search-learning-tools',
    'huggingface-asr-benchmark',
    'venturebeat-rob-strechay',
    'nvidia-nemotron-langchain'
  );
