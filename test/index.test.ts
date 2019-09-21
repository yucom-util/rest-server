import { CreateServer,  $id } from '../src';

it ('CreateServer', async function() {
  let app = CreateServer();
  app.get.people[$id](id => ({ id }));
  app.listen();
  await app.ready();
  await app.close();
});
