import { Hono } from 'hono'
import fakeUa from "fake-useragent"

const baseUrl = 'https://api.github.com'

const app = new Hono()

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
