import * as XC from 'trc-httpshim/xclient'

// Perform a login and get a token. 
interface ITokenResponse {
    access_token: string;
}

// Login, return the JWT. 
export function loginWithPasswordAsync(user: string, pswd: string): Promise<string> {
    var http = XC.XClient.New("https://trc-login.voter-science.com", null, null);
    return http.postAsync<ITokenResponse>("/web/login/password", {
        Username: user,
        Password: pswd,
        App: "listex.cli"
    }).then((response) => response.access_token);
}
