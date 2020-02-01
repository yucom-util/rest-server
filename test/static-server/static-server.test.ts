import axios from 'axios';
import { CreateServer } from '../../src/server/server';

const app = CreateServer();

describe('Static Server', () => {
  beforeAll(done => {
    app.invoke.method({foo: 'bar'});

    app.static.html('test/static-server/html');
    app.static.js('test/static-server/js');
    app.listen(7000).then(done);
  });

  it('Get html', async() => {
    const response = await axios('http://localhost:7000/html/test.html');
    expect(response.data).toMatch(/TEST HTML/);
  });

  it('Get html, implicit extension', async() => {
    const response = await axios('http://localhost:7000/html/test');
    expect(response.data).toMatch(/TEST HTML/);
  });

  it('Get html, implicit index', async() => {
    const response = await axios('http://localhost:7000/html');
    expect(response.data).toMatch(/INDEX/);
  });

  it('Get js', async() => {
    const response = await axios('http://localhost:7000/js/test.js');
    expect(response.data).toMatch(/hello: 'world'/);
  });

  afterAll(() => app.close());
});
