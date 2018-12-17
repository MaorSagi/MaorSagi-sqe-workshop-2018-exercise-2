
import $ from 'jquery';
import {convert,get_falses,get_trues,get_should_not_insert,get_globals} from './code-analyzer';



$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let codeToConvert = $('#codePlaceholder').val();
        let args = $('#argsPlaceholder').val();
        let symbolicSubstitution = convert(codeToConvert,args);
        document.getElementById('Outputholder').innerHTML = to_html(symbolicSubstitution);

    });
});


const plus = (string) => {
    let count = 0;
    while (string[0] == ' ') {
        string = string.substring(1, string.length);
        count++;
    }
    while (count > 0){
        string = '&#160;' + string;
        count--;
    }
    return string;
};


const plus_spaces = (i,string) => {
    let global_lines = get_globals();
    if(get_trues().includes(i+1+global_lines))
        string='<markGreen>'+plus(string)+'</markGreen>';
    else if(get_falses().includes(i+1+global_lines))
        string='<markRed>'+plus(string)+'</markRed>';
    else string=plus(string);

    return string;
};


const to_html = (string) => {
    let i;
    let arr = string.split('\n');
    let str='<font size="2" face="verdana">';
    let global_lines = get_globals();
    for(i=0; i<arr.length ; i++){
        if(!get_should_not_insert().includes(i+1+global_lines)){
            str += '<p>' + plus_spaces(i,arr[i]) + '</p>' ;
        }
    }
    str+='</font>';
    return str;
};




