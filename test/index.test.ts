import { StartServer,  $id, ServerError } from '../src';

it ('StartServer', async function() {
  let start = StartServer();
  start.get.people[$id](id => ({ id }));
  start.onListening(() => start.close());
});
