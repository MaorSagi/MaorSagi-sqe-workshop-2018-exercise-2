import assert from 'assert';
import {convert,get_falses,get_trues,get_globals,get_should_not_insert} from '../src/js/code-analyzer';



describe('Sub', () => {
    it('Test 1:', () => {
        assert.equal(convert('function foo(x, y){\n' +
            'let a = 5 + x;\n' +     'let b;\n' +
            'b=y;\n' +      'if(a>b){\n' +
            'return a+b;\n' +      '}\n' +
            'return a;\n' +    '}','4, 20')
            ,'function foo(x, y) {\n' +'    let a = 5 + x;\n' + '    let b;\n' +
            '    b = y;\n' +'    if (5 + x > y) {\n' +'        return 5 + x + y;\n' +
            '    }\n' + '    return 5 + x;\n' +'}');});

    it('Test 2:', () => {
        assert.equal(convert('function foo(){\n' +
            'let a = 5 + 4;\n' + 'let b;\n' +
            'b=20;\n' + 'return a+b;\n' +  '}','')
            ,'function foo() {\n' + '    let a = 9;\n' +   '    let b;\n' +
            '    b = 20;\n' + '    return 29;\n' +    '}');});

});


describe('Sub', () => {
    it('Test 3:', () => {
        assert.equal(convert('let a=3;\n' +
            'function foo(x) { \n' +            'x=a;\n' +
            'while(x<5){\n' +            'x=x+1;\n' +            'a=5;\n' +
            '}\n' +            '}','1') ,'function foo(x) {\n' +
            '    x = 3;\n' +            '    while (x < 5) {\n' +
            '        x = x + 1;\n' +   '        a = 5;\n' +  '    }\n' +
            '}');});
    it('Test 4:', () => {
        assert.equal(convert('function foo(x, y) {\n' +
            '    if (x < y) {\n' +
            '        y = M[0];\n' +            '    } else {\n' +
            '        x = M[0];\n' +            '    }\n' +
            '}','1, 2') ,'function foo(x, y) {\n' +
            '    if (x < y) {\n' +            '        y = M[0];\n' +            '    } else {\n' +
            '        x = M[0];\n' +            '    }\n' +            '}');});

});


describe('Sub', () => {
    it('Test 5:', () => {
        assert.equal(convert('function foo(x) {\n' +
            '\n' +  'while(x<10) {\n' +  '    x++;\n' +
            '}\n' +   'return -x;\n' +   '}','1') ,'function foo(x) {\n' +
            '    while (x < 10) {\n' +  '        x = x + 1;\n' + '    }\n' +
            '    return -x;\n' +
            '}');});

    it('Test 6:', () => {
        assert.equal(convert('function foo(x) {\n' +
            'if(x<5)\n' + 'x = [1,2,3];\n' + '\n' +
            'return;\n' +
            '}','1+2') ,'function foo(x) {\n' +
            '    if (x < 5)\n' + '        x = [1,2,3];\n' +
            '    return;\n' +'}');});

});

describe('Sub', () => {

    it('Test 7:', () => {
        assert.equal(convert('function foo(x, y) {\n' +
            '\n' +
            'if(x<5)\n' + 'x = [1,2,[1,2,3]];\n' + 'else if(y>2)\n' +
            'y=[];\n' + 'return;\n' + '}','7, 3') ,'function foo(x, y) {\n' +
            '    if (x < 5)\n' + '        x = [1,2,[1,2,3]];\n' +
            '    else if (y > 2)\n' +  '        y = [];\n' +
            '    return;\n' +'}');});

});



describe('Sub', () => {
    it('Test 8:', () => {
        assert.equal(convert('function foo(x, y, z){\n' +
            '    let a = x + 1;\n' +'    let b = a + y;\n' +
            '    let c = 0;\n' +'    \n' +
            '    while (a < z) {\n' + '        c = a + b;\n' +
            '        z = c * 2;\n' +'    }\n' +
            '    \n' +
            '    return z;\n' +'}\n','1, 2, 3')
            ,'function foo(x, y, z) {\n' +'    let a = x + 1;\n' +
            '    let b = x + 1 + y;\n' +'    let c = 0;\n' +
            '    while (x + 1 < z) {\n' + '        c = x + 1 + (x + 1 + y);\n' +
            '        z = (x + 1 + (x + 1 + y)) * 2;\n' +
            '    }\n' +
            '    return z;\n' +
            '}');});

});

describe('Sub', () => {
    it('Test 9:', () => {
        assert.equal(convert('function foo(x, y, z){\n' +
            '    let a = x + 1;\n    let b = a + y;\n    let c = 0;\n    \n    if (b < z) {\n        c = c + 5;\n' +
            '        return x + y + z + c;\n    } else if (b < z * 2) {\n' +
            '        c = c + x + 5;\n        return x + y + z + c;\n    } else {\n' +
            '        c = c + z + 5;\n' +
            '        return x + y + z + c;\n' +
            '    }\n' +
            '}\n','1, 2, 3')
            ,'function foo(x, y, z) {\n' +'    let a = x + 1;\n' +
            '    let b = x + 1 + y;\n' +'    let c = 0;\n' + '    if (x + 1 + y < z) {\n' +
            '        c = 5;\n' +'        return x + y + z + 5;\n' +'    } else if (x + 1 + y < z * 2) {\n' +
            '        c = 5 + x + 5;\n' +'        return x + y + z + 5;\n' + '    } else {\n' +
            '        c = 5 + z + 5;\n' + '        return x + y + z + 5;\n' +'    }\n' +
            '}');});

});


describe('Sub', () => {
    it('Test 10:', () => {
        assert.equal(convert('function f(x){\n' +
            'let M =[5,2,3];\n' +
            'if(M[1]==5)\n' +
            ' return 2;\n' +
            '}','[]')
            ,'function f(x) {\n' +
            '    let M = [5,2,3];\n' +
            '    if (false)\n' +
            '        return 2;\n' +
            '}');});


});



describe('Sub', () => {
    it('Test 11:', () => {
        assert.equal(convert('\n' +
            '\n' +
            '\n' +
            '    let d=1;\n' + 'd=[1,2,3];\n' +
            'function f(x){\n' + 'x[0]=3\n' +
            'd[0]=3\n' + 'return;\n' +
            '}', '[5,6,7]'), 'function f(x) {\n' + '    x[0] = 3;\n' +
            '    d[0] = 3;\n' + '    return;\n' + '}');
    });

});


describe('Sub', () => {
    it('Test 12:', () => {
        convert('let c=2;\n' +
            'function foo(x, y, z){\n' + '    let a = x + 1;\n' +
            '    if(a < z) {\n' +  '        z = a * 2;\n' +
            '    } else if(a<0){\n' +'        z=0;\n' +
            '    }\n' +        '    return z;\n' + '}\n','1, 2, 3');
        assert.deepEqual(get_globals() ,1);
        assert.deepEqual(get_should_not_insert() ,[3]);
        assert.deepEqual(get_trues() ,[4]);
        assert.deepEqual(get_falses() ,[6]);});
});


