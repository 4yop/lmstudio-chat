

export async function get({ url, data = {}, headers = {} }) {
    // 拼接 query string
    const params = new URLSearchParams();

    Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            params.append(key, value);
        }
    });

    const fullUrl = params.toString()
        ? `${url}${url.includes('?') ? '&' : '?'}${params}`
        : url;

    const res = await fetch(fullUrl, {
        method: "GET",
        headers
    });

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }

    return res.json();
}


export async function post({ url, data, headers = {} }) {
    const options = {
        method: "POST",
        headers: {
            ...headers,
        }
    };

    if (data !== undefined)
    {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(data);
    }

    const res = await fetch(url, options);

    if (!res.ok) {
        throw new Error(`HTTP ${res.status} `);
    }

    return res.json();
}
