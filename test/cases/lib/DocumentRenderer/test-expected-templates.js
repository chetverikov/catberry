module.exports = {
	componentsWithErrors: `
		<!DOCTYPE html>
		<html>
			<head>
		<span>head</span>
		</head>
			<body>
				document – document
				<cat-comp>
		<span>comp</span>
		
				</cat-comp>
				<cat-async-comp>
		<span>async-comp</span>
		</cat-async-comp>
			</body>
		</html>
	`,
	componentsWithStores: `
	<!DOCTYPE html>
	<html>
		<head cat-store="folder/store2">
	<title>head – folder/store2</title>
	</head>
		<body>
			document – undefined
			<cat-comp cat-store="store1">
	<div>store1</div>
	
			</cat-comp>
			<cat-async-comp cat-store="folder/store2">
	<div>folder/store2</div>
	</cat-async-comp>
		</body>
	</html>
	`,
	componentsWithStoresErrors: `
	<!DOCTYPE html>
	<html>
		<head cat-store="folder/store2">
	<span>folder/store2</span>
	</head>
		<body>
			document – document
			<cat-comp cat-store="store1">
	<span>store1</span>
	
			</cat-comp>
			<cat-async-comp cat-store="folder/store2">
	<span>folder/store2</span>
	</cat-async-comp>
		</body>
	</html>
	`,
	componentsWithTemplateErrors: `
	<!DOCTYPE html>
	<html>
		<head></head>
		<body>
			document – document
			<cat-comp>
			</cat-comp>
			<cat-async-comp></cat-async-comp>
		</body>
	</html>
	`,
	componentsWithWrongComponents: `
	<!DOCTYPE html>
	<html>
		<head><title>Hello</title></head>
		<body>
			document – document
			<cat-comp>
			</cat-comp>
			<cat-async-comp>
	<div>async-comp</div>
	</cat-async-comp>
			<cat-async-comp/>
		</body>
	</html>
	`,
	componentsWithWrongStores: `
	<!DOCTYPE html>
	<html>
		<head cat-store="folder/store2">
	<span>Store "folder/store2" not found</span>
	</head>
		<body>
			document – document
			<cat-comp cat-store="store1">
	<span>Store "store1" not found</span>
	
			</cat-comp>
			<cat-async-comp cat-store="folder/store2">
	<span>Store "folder/store2" not found</span>
	</cat-async-comp>
		</body>
	</html>
	`,
	componentsWithoutStores: `
	<!DOCTYPE html>
	<html>
		<head>
	<title>head – head</title>
	</head>
		<body>
			document – document
			<cat-comp>
	<div>comp</div>
	
			</cat-comp>
			<cat-async-comp>
	<div>async-comp</div>
	</cat-async-comp>
		</body>
	</html>
	`,
	nestedComponents: `
	<!DOCTYPE html>
	<html>
		<head>
		<title>head – head</title>
	</head>
		<body>
			document – document
			<cat-comp>
				<cat-nested>
					<div>nested</div>
				</cat-nested>
				<cat-async-nested>
					<div>async-nested</div>
				</cat-async-nested>
	
			</cat-comp>
			<cat-async-comp>
				<cat-nested>
					<div>nested</div>
				</cat-nested>
				<cat-async-nested>
					<div>async-nested</div>
				</cat-async-nested>
			</cat-async-comp>
		</body>
	</html>

	`,
	noComponents: `
	<!DOCTYPE html>
	<html>
		<head><title>Hello</title></head>
		<body>
			document – document
			<cat-comp>
			</cat-comp>
			<cat-async-comp/>
		</body>
	</html>
	`,
	redundantHeadDocument: `
	<!DOCTYPE html>
	<html>
		<head><title>Hello</title></head>
		<body>
			document – document
			<cat-comp></cat-comp>
			<cat-async-comp/>
			<head></head>
			<document></document>
		</body>
	</html>
	`
};
