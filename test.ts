export async function initialize() {
	let router = new Map
	router.set('/', () => 'hello world')
	return { router }
}

export default async function ({ path }: any, { router }: any) {
	let handler = router.get(path)
	if (!handler) return null
	return handler()
}