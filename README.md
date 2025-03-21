# Component for blocklet server benchmark

## Web API

- /api/date
- /api/date?timeout=1000
- /api/user/{did}?return=0 # wrap BlockletSDK:getUser
- /api/users&return=0 # wrap BlockletSDK:getUsers
- /api/users?search=xxx&return=0 # wrap BlockletSDK:getUsers

## More APIs

#### blocklet

- /.well-known/service/api/did/login/auth
- /.well-known/service/api/did/login/token
- /.well-known/service/api/did/session
- /.well-known/service/api/user-session
- /.well-known/service/openembed.json
- /.blocklet/proxy/\*
- `/__blocklet__.js`

#### Profile

- /.well-known/service/api/gql - getNotifications
- /.well-known/service/api/gql - getNotificationComponents

#### 登录过程，钱包会请求其他站点

- https://www.didspaces.com/app/api/user/z1kNtEtTQWtLuuRTTwVtd8ZEKdMjVe8pvUz
- https://www.didspaces.com/app/api/space/zNKuDNh3cUp94BCE5VpvA6Zg4pYUCztv8hng/app/z1cTHXPbkGwVZevuZvLNkUrnHXnBmNEo57t/profile/list
- https://main.abtnetwork.io/api/?consistentTokens=true
- https://www.didspaces.com/app/api/space/zNKuDNh3cUp94BCE5VpvA6Zg4pYUCztv8hng/app/z1cTHXPbkGwVZevuZvLNkUrnHXnBmNEo57t/contact/list
- https://main.abtnetwork.io/api/?consistentTokens=true (这个会长时间轮询)
- 并且会遍历基本上我们所有站点，但是大部分是 head 请求

#### 测试启动的时候，开启 cluster

`ABT_NODE_MAX_CLUSTER_SIZE=4 bn server start`
