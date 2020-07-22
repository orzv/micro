// Copyright @2020 orzv. All rights reserved. MIT License.
// Author: orzv
// Email: orzv@outlook.com
// Repo: https://github.com/orzv/micro

import { serve, ServerRequest } from 'https://deno.land/std/http/server.ts'
import { parse } from 'https://deno.land/std/flags/mod.ts'
import { join } from 'https://deno.land/std/path/mod.ts'

/** parse server params */
function getServerParams(): ServerParam {
	const args = parse(Deno.args)
	let [endPoint] = args._
	const entry = join(Deno.cwd(), <string>endPoint || 'main.ts')

	const port = parseInt(args.port || args.p || 9000)
	const host = args.host || '0.0.0.0'
	const limit = args.limit || 2e20 * 10
	return { entry, port, host, limit }
}

/** main program */
async function run(args?: ServerParam) {
	args = (!args) ? getServerParams() : args
	let handler: any
	try {
		handler = await import(args.entry)
		if (typeof handler.default !== 'function')
			return console.error('Entry function not found,' +
				'you need to export entry function as default.')
	} catch (err) {
		return showHelp()
	}

	try {
		let runtime: any
		if (typeof handler.initialize === 'function') {
			runtime = handler.initialize()
			if (runtime instanceof Promise) runtime = await runtime
		}

		const server = serve({ port: args.port, hostname: args.host })
		console.log(new Date, `server start at ${args.host}:${args.port}`)
		for await (const req of server) {
			console.log(new Date, req.method, req.url)
			try {
				let res = handler.default(await parseRequest(req, args),
					runtime)
				if (res instanceof Promise) res = await res
				send(req, res)
			} catch (err) {
				console.error(new Date, err.message)
				req.respond({ status: 500, body: err.message })
			}
		}
	} catch (err) {
		console.error('initialize fail', err.message)
		Deno.exit(-1)
	}
}

/** check response format */
function isResponse(r: any): boolean {
	if (typeof r !== 'object') return false
	if (typeof r.status === 'number') return true
	if (r.headers instanceof Headers) return true
	if (typeof r.trailer === 'function') return true
	if (typeof r.body === 'string') return true
	if (r.body instanceof Uint8Array) return true
	if (r.body && typeof r.body.read === 'function') return true
	return false
}

/** response message */
async function send(req: ServerRequest, body: any): Promise<void> {
	if (isResponse(body)) {
		return await req.respond(body)
	}
	if (typeof body === 'string') {
		return await req.respond({ body })
	}
	if (body instanceof Uint8Array) {
		return await req.respond({ body })
	}
	if (body && typeof body.read === 'function') {
		return await req.respond({ body })
	}
	if (typeof body === 'undefined') {
		return await req.respond({ status: 404 })
	}
	if (body === null) {
		return await req.respond({ status: 404 })
	}
	if (typeof body === 'number') {
		return await req.respond({ status: body })
	}
	if (typeof body === 'object') {
		let headers = new Headers({
			'content-type': 'application/json'
		})
		return await req.respond({
			headers,
			body: JSON.stringify(body)
		})
	}
	await req.respond({ status: 404 })
}

/** transform request message */
async function parseRequest(req: ServerRequest,
	{ limit }: ServerParam): Promise<RequestInfo> {
	let { pathname, searchParams, hash } =
		new URL(req.url, 'http://localhost')

	let body = new Deno.Buffer()
	for await (let buf of Deno.iter(req.body)) {
		body.write(buf)
		if (body.length > limit) break
	}
	return {
		path: pathname, query: searchParams, hash,
		req, url: req.url, headers: req.headers,
		method: req.method, body: body.bytes().slice(0, limit)
	}
}

/** display help information */
function showHelp() {
	console.log(`Usage: micro [entry] <options>
You can create a entry file named main.ts or specific a entry file name.

	Options:
	-p, --port      Port to listen, default 9000.
	--host          Bind hostname, default 0.0.0.0.
	--limit         Body limit size, default 2m.`)
}

/** request info */
interface RequestInfo {
	path: string
	query: URLSearchParams
	hash: string
	req: ServerRequest
	headers: Headers
	method: string
	body: Uint8Array
	url: string
}

interface ServerParam {
	entry: string
	port: number
	host: string
	limit: number
}

export { RequestInfo as Request }

if (import.meta.main) await run()