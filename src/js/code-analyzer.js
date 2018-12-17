import * as esprima from 'esprima';
import * as escodegen from 'escodegen';
export {convert,get_falses,get_trues,get_should_not_insert,get_globals};

let args_strings;
let globals;
let args_val;
let true_lines;
let false_lines;
let should_not_insert_list;
let global_lines;

const get_globals= () => global_lines;
const get_should_not_insert = () => should_not_insert_list;
const get_trues = () => true_lines;
const get_falses = () => false_lines;
const typeQuery = (obj,type) => (obj['type']==type);


const remove_white_spaces  = (string) => {
    string = exchange(exchange(string,'\n ','\n'),'\n\n','\n');
    while(string[0]==' ' ||string[0]=='\n')
        string = string.substring(1,string.length);
    return string;
};
const convert = (codeToConvert,args) => {
    global_lines=0; globals=[];
    should_not_insert_list=[];true_lines=[];false_lines=[];args_strings=[];
    args_val  = args.split(', ');
    let tmp_arr=[];
    let i;
    for(i=0 ; i< args_val.length ; i++) {
        if(args_val[i]=='')
            break;
        let tmp=(esprima.parseScript(args_val[i],{loc: true}))['body'][0];
        tmp_arr.push(tmp['expression']);
    }
    args_val=tmp_arr;
    let code = remove_white_spaces(codeToConvert);
    let obj = SymbolicSubstitution((esprima.parseScript(code,{loc: true})),[],-1);
    let out = handle_array(escodegen.generate(obj));
    return out;
};


const exchange = (line,from,to) => {
    while (line.includes(from)){
        let i = line.indexOf(from);
        line = line.substring(0, i) + to + line.substring(i + from.length, line.length);
    }
    return line;
};


const handle_array = (string) => {
    let tmp_str = string;
    let start=0;
    let arr=get_next_arr(tmp_str);
    while(arr.length!=0){
        string=string.substring(0,arr[0]+1+start)+exchange(exchange(string.substring(arr[0]+1+start,arr[1]+1+start),' ',''),'\n','')+string.substring(arr[1]+1+start,string.length);
        tmp_str=tmp_str.substring(arr[1]+1,tmp_str.length);
        arr=get_next_arr(string);
        start+=arr[1]+1;
        arr=get_next_arr(tmp_str);
    }
    return string;
};


const check = (start,end)=>((start>0)?[start,end]:[]);


const get_next_arr = (string) => {
    let i;
    let start=string.indexOf('[');
    let end;
    let counter =1;
    for( i=string.indexOf('[')+1 ; i<string.length && counter>0; i++){
        if(string[i]=='['){
            counter++;
        }
        else if(string[i]==']'){
            counter--;
        }
    }
    end=i-1;
    return check(start,end);
};
function my_eval(obj){
    let str = escodegen.generate(obj);
    let i;
    for(i=0; i<args_strings.length ; i++){
        if(str.includes(args_strings[i])){
            return obj;
        }
    }
    let evaluated = eval(str);
    obj = esprima.parseScript(evaluated.toString(),{loc: true});
    obj=obj['body'][0]['expression'];
    return obj;
}


const replace_args = (obj,env) => {

    let updated=false;
    let str = escodegen.generate(obj);
    let i;
    for(i=0;i<args_strings.length;i++) {
        if(str.includes(args_strings[i])) {
            let env_idx = env.findIndex((x) => (x['var'] == args_strings[i]));
            let curr_val_string = escodegen.generate(env[env_idx]['val']);
            str = exchange(str, args_strings[i], curr_val_string);
            updated=true;
        }

    }
    if(updated)
        obj=esprima.parseScript(str,{loc: true})['body'][0];
    return obj;
};


const args_env_handler = (variable,val,env)=>{
    let idx = args_strings.findIndex((x)=>(x==variable));
    val = replace_args(val,env);

    args_val[idx]=my_eval(val);

};


const extend_env= (env,idx,variable,val) => {
    let i;
    for (i = 0; i < env.length; i++) {
        if (env[i]['var'] == variable && env[i]['depth'] == idx) {
            let tmp = simpleSymbolicSubstitution(val, env, idx);
            if(args_strings.includes(variable)){
                args_env_handler(variable,tmp,env);
            }
            env[i]['val'] = tmp;
            return true;
        }
    }
    return false;
};

function update(env,idx,variable,val){
    let updated = extend_env(env,idx,variable,val);
    if(!updated) {
        env.unshift({var: variable, val: simpleSymbolicSubstitution(val,env,idx), depth: idx});
    }
}


function function_declaration_handler(obj,env,idx) {
    let i;
    for(i=0 ; i< obj['params'].length ; i++){
        args_strings.push(escodegen.generate(obj['params'][i]));
        update(env,idx+1,escodegen.generate(obj['params'][i]),args_val[i]);
    }
    obj['body'] = simpleSymbolicSubstitution(obj['body'],env,idx);
    return obj;
}


function expression_statement_handler(obj,env,idx) {
    obj['expression'] = simpleSymbolicSubstitution(obj['expression'],env,idx);
    return obj;
}

function variable_declaration_handler(obj,env,idx) {
    let i;
    for (i = 0; i < obj['declarations'].length; i++){
        let declarator = obj['declarations'][i];
        if(declarator['init']!=null) {
            update(env,idx,escodegen.generate(declarator['id']), declarator['init']);
            declarator['init'] = simpleSymbolicSubstitution(declarator['init'], env, idx);
        }
    }

    return obj;
}

function if_statement_handler(obj,env,idx) {
    let line = obj['loc']['start']['line'];
    let test =simpleSymbolicSubstitution(obj['test'],env,idx);
    obj['test'] = test;
    test = my_eval(replace_args(test,env))['value'];
    if(test){
        true_lines.push(eval(line));
    }
    else false_lines.push(eval(line));
    obj['consequent'] = simpleSymbolicSubstitution(obj['consequent'],env,idx);
    if(obj['alternate']== null)
        return obj;
    if(typeQuery(obj['alternate'],'IfStatement'))
        obj['alternate'] = simpleSymbolicSubstitution(obj['alternate'],env,idx-1);
    else obj['alternate'] = simpleSymbolicSubstitution(obj['alternate'],env,idx);
    return obj;
}


function while_statement_handler(obj,env,idx) {
    obj['test'] = simpleSymbolicSubstitution(obj['test'],env,idx);
    obj['body']=simpleSymbolicSubstitution(obj['body'],env,idx);
    return obj;
}


function binary_expression_handler(obj,env,idx){
    obj['left']=simpleSymbolicSubstitution(obj['left'],env,idx);
    obj['right']=simpleSymbolicSubstitution(obj['right'],env,idx);
    return my_eval(obj);
}

function assignment_expression_handler(obj,env,idx){
    obj['right'] = simpleSymbolicSubstitution(obj['right'],env,idx);
    update(env,idx,escodegen.generate(obj['left']),obj['right']);
    return obj;
}

function update_expression_handler(obj,env,idx){
    obj = esprima.parseScript(escodegen.generate(obj['argument']) +'='+
        escodegen.generate(obj['argument'])+obj['operator'][0]+'1',{loc: true})['body'][0];
    obj=obj['expression'];
    obj = simpleSymbolicSubstitution(obj,env,idx);
    return obj;
}


const get_member_name = (obj) =>{
    let arr= get_next_arr(escodegen.generate(obj));
    return escodegen.generate(obj)[arr[0]-1];

};

const get_member_rest = (obj) =>{
    let arr= get_next_arr(escodegen.generate(obj));
    return escodegen.generate(obj).substring(arr[0],arr[1]+1);
};






function member_expression_handler(obj,env,idx){
    obj['property'] = simpleSymbolicSubstitution(obj['property'],env,idx);
    let name = get_member_name(obj);
    let rest =get_member_rest(obj);
    let i;
    for(i=0;i<env.length;i++) {
        if (env[i]['var'] == name && !(args_strings.includes(env[i]['var']))){
            let evaluated = eval(escodegen.generate(env[i]['val'])+rest);
            obj=esprima.parseScript(evaluated.toString(),{loc: true});
            obj=obj['body'][0]['expression'];
            break;
        }
    }
    return obj;
}

function unary_expression_handler(obj,env,idx){
    obj['argument'] = simpleSymbolicSubstitution(obj['argument'],env,idx);
    return obj;
}


function block_statement_handler(obj,env,idx){
    obj['body'] = arrSymbolicSubstitution(obj['body'],env,(idx+1));
    return obj;
}

function return_statement_handler(obj,env,idx){
    if(obj['argument']!=null)
        obj['argument']=simpleSymbolicSubstitution(obj['argument'],env,idx);
    return obj;
}

function identifier_handler(obj,env){
    let i;
    for(i=0;i<env.length;i++) {
        if (env[i]['var'] == escodegen.generate(obj) && !(args_strings.includes(env[i]['var']))){
            obj = env[i]['val'];
            break;
        }
    }
    return obj;

}

function array_expression_handler(obj,env,idx){
    obj['elements'] =  arrSymbolicSubstitution(obj['elements'],env,idx);
    return obj;
}




const check_ass = (obj) =>
    (typeQuery(obj, 'AssignmentExpression') &&
        (typeQuery(obj['left'],'MemberExpression')?
            !args_strings.includes(get_member_name(obj['left']))&&
            !globals.includes(get_member_name(obj['left'])) :
            !args_strings.includes(escodegen.generate(obj['left'])) &&
            !globals.includes(escodegen.generate(obj['left']))));

const check_var = (obj)=>
    (typeQuery(obj, 'VariableDeclaration') &&
            !args_strings.includes(escodegen.generate(obj['declarations'][0]['id'])) &&
            !globals.includes(escodegen.generate(obj['declarations'][0]['id'])));




function should_insert(obj) {
    if (check_ass(obj)|| check_var(obj))
        return false;
    if (typeQuery(obj, 'ExpressionStatement')) {
        return should_insert(obj['expression']);
    }
    return true;
}


const arrSymbolicSubstitution = (obj,env,idx) => {
    let i;
    for (i=0 ; i<obj.length ; i++) {
        let line = obj[i]['loc']['start']['line'];
        obj[i] = simpleSymbolicSubstitution(obj[i], env, idx);
        if(!should_insert(obj[i])) {
            should_not_insert_list.push(eval(line));
        }
    }

    return obj;
};

const SymbolicSubstitution = (obj,env,idx) => {
    let i=0;
    while(!typeQuery(obj['body'][i],'FunctionDeclaration')){
        if(typeQuery(obj['body'][i],'VariableDeclaration'))
            globals.push(obj['body'][i]['declarations'][0]['id']['name']);
        global_lines++;
        i++;
    }
    obj['body'] = arrSymbolicSubstitution(obj['body'], env, idx);
    for(i=0;i<obj['body'].length ;i++){
        if(obj['body'][i]['type']=='FunctionDeclaration')
            obj=obj['body'][i];
    }
    return obj;
};

const simpleSymbolicSubstitution = (obj,env,idx) =>
    typeQuery(obj,'VariableDeclaration') ? variable_declaration_handler(obj,env,idx) :typeQuery(obj,'UpdateExpression') ? update_expression_handler(obj,env,idx) :
        typeQuery(obj,'MemberExpression') ? member_expression_handler(obj,env,idx): FuncSymbolicSubstitution(obj,env,idx);

const FuncSymbolicSubstitution = (obj,env,idx) => typeQuery(obj,'FunctionDeclaration') ?  function_declaration_handler(obj,env,idx) :
    typeQuery(obj,'BinaryExpression')? binary_expression_handler(obj,env,idx) : typeQuery(obj,'UnaryExpression') ? unary_expression_handler(obj,env,idx):
        typeQuery(obj,'AssignmentExpression')? assignment_expression_handler(obj,env,idx) : LoopSymbolicSubstitution(obj,env,idx);

const LoopSymbolicSubstitution = (obj,env,idx) =>  typeQuery(obj,'WhileStatement') ? while_statement_handler(obj,env,idx)
    : ConditionSymbolicSubstitution(obj,env,idx);

const ConditionSymbolicSubstitution = (obj,env,idx) => typeQuery(obj,'IfStatement') ? if_statement_handler(obj,env,idx) :
    SpecialSymbolicSubstitution(obj,env,idx);


const SpecialSymbolicSubstitution = (obj,env,idx) => typeQuery(obj,'ExpressionStatement') ? expression_statement_handler(obj,env,idx) :
    typeQuery(obj,'ReturnStatement') ? return_statement_handler(obj,env,idx) : typeQuery(obj,'BlockStatement') ? block_statement_handler(obj,env,idx):
        typeQuery(obj,'ArrayExpression') ? array_expression_handler(obj,env,idx) : AtomicSymbolicSubstitution(obj,env);




const AtomicSymbolicSubstitution = (obj,env) => typeQuery(obj,'Identifier') ?  identifier_handler(obj,env): obj;