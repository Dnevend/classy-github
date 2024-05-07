import { Hono } from 'hono'
import { cors } from 'hono/cors'
import fakeUa from "fake-useragent"
import { fetchDataForAllYears } from './utils/githubContributions'

const baseUrl = 'https://api.github.com'

const app = new Hono()

app.use('/api/*', cors())

app.get('/api/github-contributions/:user', (c) => {
  return fetchDataForAllYears(c.req.param().user).then(res => {
    return c.json(res)
  })
})

app.get('/*', async (c) => {
  const url = baseUrl + c.req.path

  const params = c.req.query();

  const queryParams = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  const fetchUrl = `${url}?${queryParams}`

  const req = new Request(fetchUrl, {
    method: 'get',
    headers: { 'user-agent': fakeUa() }
  })

  return fetch(req)
})

export default app
