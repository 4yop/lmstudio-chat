

export function format(msg ,data ,code)
{
    return {
        msg :  msg,
        data : data,
        code : code
    }
}

export function success(data = null ,msg = 'ok' ,code = 1)
{
    return format(msg ,data ,code);
}

export function fail(msg = 'fail',code = 0,data = null )
{
    return format(msg ,data ,code);
}