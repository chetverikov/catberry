module.exports = {
	component: value => `<div>${value}</div>`,
	componentWithNested: value => `
		<cat-nested></cat-nested>
		<cat-async-nested></cat-async-nested>
	`,
	document: value => `
		<!DOCTYPE html>
		<html>
			<head><title>Hello</title></head>
			<body>
				document – ${value}
				<cat-comp>
				</cat-comp>
				<cat-async-comp/>
			</body>
		</html>
	`,
	documentWithHead: value => `
		<!DOCTYPE html>
		<html>
			<head></head>
			<body>
				document – ${value}
				<cat-comp>
				</cat-comp>
				<cat-async-comp/>
			</body>
		</html>
	`,
	documentWithHeadAndStores: value => `
		<!DOCTYPE html>
		<html>
			<head cat-store="folder/store2"></head>
			<body>
				document – ${value}
				<cat-comp cat-store="store1">
				</cat-comp>
				<cat-async-comp cat-store="folder/store2"/>
			</body>
		</html>
	`,
	documentWithWrongIds: value => `
		<!DOCTYPE html>
		<html>
			<head><title>Hello</title></head>
			<body>
				document – ${value}
				<cat-comp>
				</cat-comp>
				<cat-async-comp/>
				<cat-async-comp/>
			</body>
		</html>
	`,
	head: value => `<title>head – ${value}</title>`,
	redundantHeadDocument: value => `
		<!DOCTYPE html>
		<html>
			<head><title>Hello</title></head>
			<body>
				document – ${value}
				<cat-comp></cat-comp>
				<cat-async-comp/>
				<head></head>
				<document></document>
			</body>
		</html>
	`,

	error: value => `<span>${value}</span>`,
	throwError: value => `${value}`
};
