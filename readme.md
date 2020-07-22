# Micro

Deno http library like micro.

its suitable for deploy a microservice.

## Install

```shell
deno install -A https://github.com/orzv/micro/raw/master/micro.ts
```

## Usage

Create a file named `main.ts`:

```typescript
// export main function as default
export default async () => {
	return 'hello world'
}
```

Start your server:

```shell
cd /path/to/main
micro
```
The default entry file is `main.ts`,
You can use other file name:

```shell
micro other.ts
```

The default port is `9000`,
You can specific port:

```shell
micro -p 8080
```

Bind hostname:

```shell
micro -p 8080 --host example.com
```

Limit body size:

```shell
micro -p 8080 --limit 1024000
```

## Coding

### Request info

```typescript
export default async (ctx) => {
	ctx.method   // method
	ctx.path     // pathname
	ctx.url      // url
	ctx.query    // search params
	ctx.headers  // headers
	ctx.req      // origin ServerRequest

	// get query value
	let id = ctx.query.get('id')

	// get header value
	let host = ctx.headers.get('host')

	// request body
	// the body is instance of Uint8Array
	// you can parse to string
	let body = new TextDecoder().decode(ctx.body)

	// response

	// string or uint8array
	return 'hello world'
	return UInt8Array.from([1, 2, 3])

	// with reader or file
	return await Deno.open('/path/to/file')

	// json
	return { message:'hello world' }

	// response specific status code and headers
	// use Response interface
	return {
		status: 200,
		headers: new Headers({ dnt: '1' }),
		body: 'something response'
	}

	// if you return nothing, micro will response 404 status code with empty body
}
```

### Initialize

You can export an initialize function, which return a runtime object, you can using it on each request:

```typescript
export async function initialize() {
	// example: connect to database
	let db = await connectToDB()

	// example: init a router
	let router = new Router

	// If initialize failed, micro will shutdown server.
	// throw new Error()
	return { db, router }
}

// You can declared main as sync function, initialize also
export default function (ctx: any, { db, router }: YourRuntime) {
	router.match(ctx.path)
	return db.query('some data')
}
```