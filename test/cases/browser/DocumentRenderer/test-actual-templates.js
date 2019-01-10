module.exports = {
  clickable1: (value) => `${value}<div><a class="clickable"></a></div><cat-test2></cat-test2>`,
  clickable2: (value) => `${value}<span><a class="clickable"></a></span>`,
  clickable3: (value) => `${value}<div><a class="clickable"><span><div class="toclick"></div></span></a></div>`,
  complexHead: () => `
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
  complexHead2: () => `
    <title>Second title</title>
    <base href="someLink2" target="_parent">
    <noscript>noScript2</noscript>
    <style type="text/css">some styles1</style>
    <script type="application/javascript">some scripts1</script>
    <script type="application/javascript" src="someScriptSrc1x"></script>
    <link rel="stylesheet" href="someStyleLink1">
    <meta name="name1" content="value1">
    <style type="text/css">some styles3</style>
    <script type="application/javascript">some scripts3</script>
    <script type="application/javascript" src="someScriptSrc3"></script>
    <link rel="stylesheet" href="someStyleLink3">
    <link rel="author" href="Mr.UltraCat">
    <meta name="name4" content="value4">
  `,
  complexHead3: () => `
    <title>Second title</title>
    <base href="someLink2" target="_parent"/>
    <noscript>noScript2</noscript>
    <style type="text/css">some styles1</style>
    <script type="application/javascript">some_scripts1</script>
    <script type="application/javascript" src="someScriptSrc1x"></script>
    <link rel="stylesheet" href="someStyleLink1"/>
    <meta name="name1" content="value1"/>
    <style type="text/css">some styles3</style>
    <script type="application/javascript">some_scripts3</script>
    <script type="application/javascript" src="someScriptSrc3"></script>
    <link rel="stylesheet" href="someStyleLink3"/>
    <link rel="author" href="Mr.UltraCat"/>
    <meta name="name4" content="value4"/>
  `,
  documentManyNested: () => `
    <!DOCTYPE html>
    <html>
    <head>
    </head>
    <body>
    <cat-comp id="18">
      <cat-comp id="17">
        <cat-comp id="13"></cat-comp>
        <cat-comp id="12">
          <cat-comp id="6">
            <cat-comp id="3"></cat-comp>
          </cat-comp>
        </cat-comp>
        <cat-comp id="11"></cat-comp>
      </cat-comp>
      <cat-comp id="16">
        <cat-comp id="10">
          <cat-comp id="5">
            <cat-comp id="2"></cat-comp>
          </cat-comp>
        </cat-comp>
        <cat-comp id="9">
          <cat-comp id="4">
            <cat-comp id="1"></cat-comp>
          </cat-comp>
        </cat-comp>
        <cat-comp id="8"></cat-comp>
      </cat-comp>
      <cat-comp id="15"></cat-comp>
      <cat-comp id="14">
        <cat-comp id="7"></cat-comp>
      </cat-comp>
    </cat-comp>
    </body>
    </html>
  `,
  nested1: (value) => `
    <div>Hello from ${value}</div>
    <cat-test2></cat-test2>
    <cat-test3></cat-test3>
  `,
  nested2: (value) => `
    <span>Hello from ${value}
      <cat-test3></cat-test3>
    </span>
  `,
  renderTestComp1: (value) => `
    <span>Hello from ${value}</span>
    <cat-test2 id="in-test1-1" cat-store="store2"></cat-test2>
    <cat-test3 id="in-test1-2" cat-store="store1"></cat-test3>
  `,
  renderTestComp2: (value) => `
    <span>Hello from ${value}
      <cat-wrong id="wrong-1" cat-store="store1">
          <cat-test3 id="in-test2-1" cat-store="store1"></cat-test3>
      </cat-wrong>
    </span>
  `,
  renderTestComp3: (value) => `
    <div>Hello from ${value}
        <cat-test5 id="in-test3-1" cat-store="store2"></cat-test5>
    </div>
  `,
  renderTestComp4: (value) => `
    <div>Hello from ${value}
        <cat-test5 id="in-test4-1" cat-store="store2"></cat-test5>
    </div>
  `,
  renderTestPage: (value) => `
    <cat-test1 id="root">
        <span>Hello from root</span>
        <cat-test2 id="in-test1-1" cat-store="store2">
            <span>Hello from in-test1-1
                <cat-wrong id="wrong-1" cat-store="store1">
                    <cat-test3 id="in-test2-1" cat-store="store1">
                        <div>Hello from in-test2-1
                            <cat-test5 id="in-test3-1" cat-store="store2">
                                in-test3-1<br><div>Hello, World!</div>
                            </cat-test5>
                        </div>
                    </cat-test3>
                </cat-wrong>
            </span>
        </cat-test2>
        <cat-test4 id="in-test1-2" cat-store="store1">
            <div>Hello from in-test1-2
                <cat-test5 id="in-test4-1" cat-store="store2"></cat-test5>
            </div>
        </cat-test4>
    </cat-test1>
  `,
  simpleComponent: (value) => `${value}<br><div>Hello, World!</div>`,
  stub: () => '<html><head></head><body></body></html>',

  error: (value) => `<span>${value}</span>`,
  throwError: (value) => `${value}`,
};
