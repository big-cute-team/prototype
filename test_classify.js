const { classifyPost } = require('./api/_lib/ai');
const { select } = require('./api/_lib/supabase');

async function main() {
  const aliases = await select(
    'team_aliases',
    'select=team_code,alias,entity_type&active=eq.true&order=team_code.asc,alias.asc'
  );
  console.log(`Loaded ${aliases.length} aliases`);

  const post = {
    id: 'test-001',
    text: `Surprised at Harry Maguire omission from England squad. Aside from ability, useful in set piece situations and good around the camp. When he spoke to us in Maynooth last month said this: "I'm desperate to go, whatever role the manager would want me for. Whether that's starting or whether it's deciding games late on. I still believe, even at my age, I'm arguably one of the best defenders in the world in both boxes. I don't think that's to question really. That can be really effective later on in games, whether you're holding on to a lead or trying to chase a game. I still think there's an important part that I can play in, that I can help."`,
    media: [],
    created_at: new Date().toISOString(),
  };

  console.log('\n--- Classifying post ---');
  const result = await classifyPost(post, aliases);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
