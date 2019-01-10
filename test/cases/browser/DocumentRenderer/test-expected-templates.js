module.exports = {
  clickable: `
    test1<div><a class="clickable">inner:test1</a></div><cat-test2>test2<span><a class="clickable">inner:test2inner:test1</a></span>
    </cat-test2>
  `,
  complexHead: `
    <title>First title</title>
    <base href="someLink1" target="_parent">
    <style type="text/css">some styles1</style>
    <style type="text/css">some styles2</style>
    <script type="application/javascript">some scripts1</script>
    <script type="application/javascript">some scripts2</script>
    <script type="application/javascript" src="someScriptSrc1"></script>
    <script type="application/javascript" src="someScriptSrc2"></script>
    <link rel="stylesheet" href="someStyleLink1">
    <link rel="stylesheet" href="someStyleLink2">
    <link rel="author" href="Mr.SuperCat">
    <meta name="name1" content="value1">
    <meta name="name2" content="value2">
    <meta name="name3" content="value3">
  `,
  dispatchedEvent: `
    test1<div><a class="clickable"><span><div class="toclick"></div>Component1</span></a>Component1</div>
  `,
  mergedHead: `
    <style type="text/css">some styles1</style>
    <style type="text/css">some styles2</style>
    <script type="application/javascript">some scripts1</script>
    <script type="application/javascript">some scripts2</script>
    <script type="application/javascript" src="someScriptSrc1"></script>
    <script type="application/javascript" src="someScriptSrc2"></script>
    <link rel="stylesheet" href="someStyleLink1">
    <link rel="stylesheet" href="someStyleLink2"><title>Second title</title>
    <base href="someLink2" target="_parent">
    <noscript>noScript2</noscript>
    <script type="application/javascript" src="someScriptSrc1x"></script>
    <meta name="name1" content="value1">
    <style type="text/css">some styles3</style>
    <script type="application/javascript">some scripts3</script>
    <script type="application/javascript" src="someScriptSrc3"></script>
    <link rel="stylesheet" href="someStyleLink3">
    <link rel="author" href="Mr.UltraCat">
    <meta name="name4" content="value4">
  `,
  mergedHead2: `
    <style type="text/css">some styles1</style>
    <script type="application/javascript">some_scripts1</script>
    <script type="application/javascript" src="someScriptSrc1x"></script>
    <link rel="stylesheet" href="someStyleLink1">
    <style type="text/css">some styles3</style>
    <script type="application/javascript">some_scripts3</script>
    <script type="application/javascript" src="someScriptSrc3"></script>
    <link rel="stylesheet" href="someStyleLink3"><title>Second title</title>
    <base href="someLink2" target="_parent">
    <noscript>noScript2</noscript>
    <meta name="name1" content="value1">
    <link rel="author" href="Mr.UltraCat">
    <meta name="name4" content="value4">
  `,
  nestedComponents: `
    <div>Hello from <span>test1</span></div>
    <cat-test2><span>Hello from <span>test2</span>
      <cat-test3><span>test3</span><br><div>Hello, World!</div>
    </cat-test3>
    </span>
    </cat-test2>
    <cat-test3><span>test3</span><br><div>Hello, World!</div>
    </cat-test3>
  `,
  notDispatchedEvent: `
    test1<div><a class="clickable"><span><div class="toclick"></div></span></a></div>
  `,
  testErrorComponent: `
    <span>test</span>
  `,
  testSimpleComponent: `
    <span>test</span><br><div>Hello, World!</div>
  `,
};
