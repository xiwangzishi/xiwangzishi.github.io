var nebulas = require("nebulas"),
    NebPay = require("nebpay"),
    HttpRequest = nebulas.HttpRequest,
    Neb = nebulas.Neb,
    // Account = nebulas.Account,
    // Transaction = nebulas.Transaction,
    Unit = nebulas.Unit,
    Utils = nebulas.Utils;

var chainnetConfig = {
    mainnet: {
        name: "主网",
        contractAddress: "n1jWpKadorv27XgSbo4WRZvsyCdAajkEP4B",
        txhash: "04222aa816c36a7895efd59256f4f2844fae253064ebc40c155266e3d6cc5220",
        host: "https://mainnet.nebulas.io",
        payhost: "https://pay.nebulas.io/api/mainnet/pay"
    },
    testnet: {
        name: "测试网",
        contractAddress: "n1iw6b9KtKsGaeKPi7GEyJDRLibpw4jf8f9",
        txhash: "6c9ebc2b9d1e5c6b035b05ba6448911d17599b2026c9d0bd504c372b5f8fe977",
        host: "https://testnet.nebulas.io",
        payhost: "https://pay.nebulas.io/api/pay"
    },
    localnet: {
        name: "本地网",
        contractAddress: "n1iw6b9KtKsGaeKPi7GEyJDRLibpw4jf8f9",
        txhash: "6c9ebc2b9d1e5c6b035b05ba6448911d17599b2026c9d0bd504c372b5f8fe977",
        host: "http://localhost:8685",
        payhost: "https://pay.nebulas.io/api/pay"
    }
}

var chain = localStorage.getItem("chain") || "mainnet"
var chainInfo = chainnetConfig[chain]

var neb = new Neb();
neb.setRequest(new HttpRequest(chainInfo.host));

var nasApi = neb.api;
var nebPay = new NebPay();

var cls, app, nebState;

function getErrMsg(err) {
    var msg = ""
    if (err == 'Call: Error: 403') {
        msg = "权限禁止"
    }
    return msg
}

function mylog() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift("bbs-->")
    console.log.apply(console, args);
}

var CategoryListComponent = {
    template: '#category-list-tpl',
    methods: {
        addFavCategory: function (item) {
            var data = {
                address: app.contractAddress,
                value: 0,
                func: "addFavCategory",
                data: [item.slug],
                context: this,
                successMsg: "收藏栏目",
                successFunc: function (resp) {
                    location.reload()
                },
            }

            this.$eventHub.$emit("nebPayCall", data)

        }
    }
}

var MyFllowComponent = {
    template: '#my-fllow-tpl',
    methods: {
        fetchMyFllow: function () {
            var _this = this
            nasApi.call({
                chainID: nebState.chain_id,
                from: app.address || chainInfo.contractAddress,
                to: chainInfo.contractAddress,
                value: 0,
                // nonce: nonce,
                gasPrice: 1000000,
                gasLimit: 2000000,
                contract: {
                    function: "fllowList",
                    args: JSON.stringify([app.address])
                }
            }).then(function (resp) {
                _this.loadingStatus = false
                var result = JSON.parse(resp.result)
                if (result) {
                    _this.myFllow = result
                }
            })
        },
        unfllow: function (item) {
            var data = {
                address: app.contractAddress,
                value: 0,
                func: "unfllow",
                data: [item.address],
                context: this,
                successMsg: "取消关注成功",
                successFunc: function (resp) {
                    location.reload()
                },
            }

            this.$eventHub.$emit("nebPayCall", data)
        }
    },
    created: function () {
        this.fetchMyFllow()
    },
    data: function () {
        return {
            loadingStatus: true,
            myFllow: {
                total: 0,
                fllow: []
            }
        }
    }
}

var FavCategoryListComponent = {
    template: '#fav-category-list-tpl',
    methods: {
        delFavCategory: function (item) {
            var data = {
                address: app.contractAddress,
                value: 0,
                func: "delFavCategory",
                data: [item.slug],
                context: this,
                successMsg: "取消栏目收藏成功",
                successFunc: function (resp) {
                    location.reload()
                },
            }

            this.$eventHub.$emit("nebPayCall", data)
        },
        fetchMycategory: function () {
            var _this = this
            nasApi.call({
                chainID: nebState.chain_id,
                from: app.address || chainInfo.contractAddress,
                to: chainInfo.contractAddress,
                value: 0,
                // nonce: nonce,
                gasPrice: 1000000,
                gasLimit: 2000000,
                contract: {
                    function: "allFavCategory",
                    args: JSON.stringify([])
                }
            }).then(function (resp) {
                _this.loadingStatus = false
                var result = JSON.parse(resp.result)
                if (result) {
                    // alert(JSON.stringify(result))
                    _this.favCategory = result
                }
            })
        }
    },
    created: function () {
        this.fetchMycategory()
    },
    data: function () {
        return {
            loadingStatus: true,
            favCategory: {
                total: 0,
                category: []
            }
        }
    }
}

var HomeComponent = {
    template: '#home-tpl',
    props: ['page'],
    methods: {
        loadingMore: function () {
            if (this.page == "favTopic") {
                this.offset = this.topicList.nextIndex
            } else {
                this.offset -= this.limit
            }
            if (this.offset < 0) {
                return
            }

            this.loadingMoreStatus = true
            this.loadingMoreText = "正在加载"
            this.fetchTopicList()
        },
        fetchTopicList: function () {
            var _this = this,
                func = "topicList",
                data = [this.limit, this.offset];

            if (this.page == "category") {
                func = "categoryTopicList"
                data = [this.slug, this.limit, this.offset]
            } else if (this.page == "myTopic") {
                func = "userTopicList"

                data = [this.userHash || app.address, this.limit, this.offset]
            } else if (this.page == "favTopic") {
                func = "allFavTopic"
                data = [this.limit, this.offset]
            }

            nasApi.call({
                chainID: nebState.chain_id,
                from: app.address || chainInfo.contractAddress,
                to: chainInfo.contractAddress,
                value: 0,
                // nonce: nonce,
                gasPrice: 1000000,
                gasLimit: 2000000,
                contract: {
                    function: func,
                    args: JSON.stringify(data)
                }
            }).then(function (resp) {

                _this.loading = false

                var result = JSON.parse(resp.result)
                if (result) {
                    if (_this.offset == -1) {
                        _this.offset = result.total - 1
                    }
                    _this.loadingMoreStatus = false
                    var len = result.topic.length
                    if (!len || len < _this.limit || result.nextIndex == -1) {
                        _this.loadingMoreText = "没有更多内容"
                        _this.loadingMoreDisabled = true
                    } else {
                        _this.loadingMoreText = "加载更多"
                    }
                    _this.topicList.total = result.total
                    _this.topicList.topic = _this.topicList.topic.concat(result.topic)
                    _this.topicList.nextIndex = result.nextIndex
                }
            })
        },
        fetchUserInfo: function () {
            this.userNickName = ""
            if (!this.userHash) {
                this.userNickName = "我"
                return
            }
            var _this = this
            nasApi.call({
                chainID: nebState.chain_id,
                from: app.address || chainInfo.contractAddress,
                to: chainInfo.contractAddress,
                value: 0,
                // nonce: nonce,
                gasPrice: 1000000,
                gasLimit: 2000000,
                contract: {
                    function: "getUser",
                    args: JSON.stringify([this.userHash, true])
                }
            }).then(function (resp) {
                var result = JSON.parse(resp.result)
                if (result) {
                    _this.userNickName = result.nickName
                    _this.user = result
                }
            })

        },
    },
    created: function () {
        this.userHash = this.$route.params.hash
        this.fetchUserInfo()
        this.fetchTopicList()
    },
    watch: {
        "$route": function () {
            this.loading = true
            this.slug = this.$route.params.slug
            this.offset = -1
            this.topicList.total = 0
            this.topicList.topic = []
            this.userHash = this.$route.params.hash
            this.fetchTopicList()
            this.fetchUserInfo()
        }
    },
    data: function () {
        var slug = this.$route.params.slug;

        return {
            loadingMoreText: "加载更多",
            loadingMoreDisabled: false,
            userHash: "",
            loadingMoreStatus: false,
            loading: true,
            user: {
                nickName: ""
            },
            userNickName: "",
            offset: -1,
            limit: 30,
            slug: slug,
            topicList: {
                total: 0,
                topic: [],
                nextIndex: 0
            }
        }
    }
}

function newEditor(id, options) {
    if (!options) {
        options = {}
    }
    return editormd(id, {
        width: "100%",
        autoFocus : false,
        height: options.height || 640,
        syncScrolling: "single",
        path: "editor.md/lib/",
        toolbarIcons: function () {
            // Or return editormd.toolbarModes[name]; // full, simple, mini
            // Using "||" set icons align right.
            return ["bold", "del", "italic", "quote", "|", "h1", "h2", "h3", "h4", "h5", "|", "list-ul", "list-ol", "hr", "|", "link", "image", "code", "code-block", "table", "html-entities", "|", "watch", "preview", "fullscreen", "help", "info"]
        },
    });
}
var AddTopicComponent = {
    template: '#add-topic-tpl',
    mounted: function () {
        this.editor = newEditor('editormd')
    },
    created: function () {

    },
    watch: {
        "$eventHub.categoryList": function (n) {
            this.category = n.category
        }
    },
    methods: {
        submitForm: function (form) {
            var err = "",
                _this = this,
                isAddContent = this.action == "addContent";
            this.topic.content = this.editor.getMarkdown()
            if (!app.user.nickName) {
                return this.$message.error("请先完善用户信息");
            }
            if (this.topic.title.length < 5) {
                err = "标题至少5个字符！"
                return this.$message.error(err);
            }
            if (!isAddContent && !this.topic.category) {
                err = "请选择主题栏目"
                return this.$message.error(err);
            }

            if (isAddContent && this.topic.content.length < 10) {
                return this.$message.error("内容不能少于10个字符");
            }

            var data = [this.topic],
                func = "addTopic";
            if (this.action == "addContent") {
                data = [{
                    topicHash: this.hash,
                    content: this.topic.content
                }]
                func = "addTopicAdditional"
            }

            var data = {
                address: app.contractAddress,
                value: 0,
                func: func,
                data: data,
                context: this,
                successMsg: this.action == "addContent" ? "补充主题成功" : "添加主题成功",
                successFunc: function (resp) {
                    _this.$router.push({
                        name: "topic",
                        params: {
                            hash: _this.action == "addContent" ? _this.hash : resp.hash
                        }
                    })
                },
            }

            this.$eventHub.$emit("nebPayCall", data)
        }
    },
    data: function () {
        return {
            editor: null,
            action: this.$route.query.action,
            hash: this.$route.query.hash,
            topic: {
                title: this.$route.query.title || "",
                content: "",
                category: "",
                openDonate: false,
            },
            category: app.categoryList.category,
        }
    }
}

var MyDonateComponent = {
    template: '#my-donate-tpl',
    methods: {
        loadingMore: function () {
            this.offset = this.offset - this.limit
            if (this.offset < 0) {
                this.noMoreData = true
                this.loadingMoreText = "没有更多数据"
                return
            }
            this.loadingMoreStatus = true
            this.loadingMoreText = "正在加载…"
            this.fetchMyDonate()
        },
        fetchMyDonate: function () {
            var _this = this
            nasApi.call({
                chainID: nebState.chain_id,
                from: app.address || chainInfo.contractAddress,
                to: chainInfo.contractAddress,
                value: 0,
                // nonce: nonce,
                gasPrice: 1000000,
                gasLimit: 2000000,
                contract: {
                    // function: "getDonateList",
                    function: "donateList",
                    args: JSON.stringify([this.limit, this.offset])
                }
            }).then(function (resp) {
                var result = JSON.parse(resp.result)

                _this.loadingMoreStatus = false
                _this.donateListLoading = false
                _this.loadingMoreText = "加载更多"

                if (!result) {
                    return
                }

                if (_this.offset == -1) {
                    _this.offset = result.total - 1
                }
                _this.donateList.total = result.total
                _this.donateList.donate = _this.donateList.donate.concat(result.donate)
                _this.donateList.donateNas = result.donateNas
            })

        }
    },
    created: function () {
        this.fetchMyDonate()
    },
    data: function () {
        return {
            donateListLoading: true,
            loadingMoreStatus: false,
            loadingMoreText: "加载更多",
            noMoreData: false,
            offset: -1,
            limit: 15,
            donateList: {
                total: 0,
                donate: [],
                donateNas: 0
            }
        }
    }
}


var MyReceivedDonateComponent = {
    template: '#my-received-donate-tpl',
    methods: {
        loadingMore: function () {
            this.offset = this.offset - this.limit
            if (this.offset < 0) {
                this.noMoreData = true
                this.loadingMoreText = "没有更多数据"
                return
            }
            this.loadingMoreStatus = true
            this.loadingMoreText = "正在加载…"
            this.fetchMyReceivedDonate()
        },
        fetchMyReceivedDonate: function () {
            var _this = this
            nasApi.call({
                chainID: nebState.chain_id,
                from: app.address || chainInfo.contractAddress,
                to: chainInfo.contractAddress,
                value: 0,
                // nonce: nonce,
                gasPrice: 1000000,
                gasLimit: 2000000,
                contract: {
                    function: "getDonateList",
                    args: JSON.stringify([this.limit, this.offset])
                }
            }).then(function (resp) {


                _this.loadingMoreStatus = false
                _this.donateListLoading = false
                _this.loadingMoreText = "加载更多"

                var result = JSON.parse(resp.result)

                if (!result) {
                    return
                }

                if (_this.offset == -1) {
                    _this.offset = result.total - 1
                }
                _this.donateList.total = result.total
                _this.donateList.donate = _this.donateList.donate.concat(result.donate)
                _this.donateList.getDonateNas = result.getDonateNas
                // mylog(JSON.stringify(result.donate))
            })

        }
    },
    created: function () {
        this.fetchMyReceivedDonate()
    },
    data: function () {
        return {
            donateListLoading: true,
            loadingMoreStatus: false,
            loadingMoreText: "加载更多",
            noMoreData: false,
            offset: -1,
            limit: 15,
            donateList: {
                total: 0,
                donate: [],
                getDonateNas: 0
            }
        }
    }
}

var MyReplyComponent = {
    template: '#my-reply-tpl',
    methods: {
        setNoMoreData: function () {
            this.noMoreData = true
            this.loadingMoreText = "没有更多数据"
        },
        loadingMore: function () {
            if (this.noMoreData) {
                return this.setNoMoreData()
            }

            this.offset -= this.limit

            if (this.offset < 0) {
                return this.setNoMoreData()
            }

            if (this.offset == 0) {
                this.noMoreData = true
            }

            this.replyListMoreLoading = true
            this.fetchReplyList()
        },
        fetchReplyList: function () {
            var _this = this
            nasApi.call({
                chainID: nebState.chain_id,
                from: app.address || chainInfo.contractAddress,
                to: chainInfo.contractAddress,
                value: 0,
                // nonce: nonce,
                gasPrice: 1000000,
                gasLimit: 2000000,
                contract: {
                    function: "userReplyList",
                    args: JSON.stringify([this.limit, this.offset])
                }
            }).then(function (resp) {
                var result = JSON.parse(resp.result)
                _this.replyListLoading = false
                _this.replyListMoreLoading = false
                if (!result) {
                    return
                }

                if (_this.offset == -1) {
                    _this.offset = result.total - 1
                }

                _this.replyList.total = result.total
                if (result.reply.length) {
                    _this.loadingMoreText = "加载更多"
                    _this.replyList.reply = _this.replyList.reply.concat(result.reply)
                } else {
                    _this.setNoMoreData()
                }
                if (_this.noMoreData) {
                    _this.loadingMoreText = "没有更多数据"
                }

            })
        }
    },
    created: function () {
        this.fetchReplyList()
    },
    data: function () {
        return {
            replyList: {
                total: 0,
                reply: []
            },
            noMoreData: false,
            offset: -1,
            replyListMoreLoading: false,
            limit: 12,
            loadingMoreText: "加载更多",
            replyListLoading: true,
        }
    }
}


var TopicComponent = {
    template: '#topic-tpl',
    mounted: function () {
        this.editor = newEditor('reply-editor', {
            height: 200
        })
    },
    methods: {
        fetchTopic: function () {
            var _this = this

            nasApi.call({
                chainID: nebState.chain_id,
                from: app.address || chainInfo.contractAddress,
                to: chainInfo.contractAddress,
                value: 0,
                // nonce: nonce,
                gasPrice: 1000000,
                gasLimit: 2000000,
                contract: {
                    function: "getTopic",
                    args: JSON.stringify([this.hash])
                }
            }).then(function (resp) {
                _this.loading = false
                var result = JSON.parse(resp.result)
                if (result) {
                    // mylog(result)
                    _this.topic = result
                }
            })
        },
        donateTopic: function () {
            this.donate({
                source: "topic",
                name: "主题",
                address: this.topic.author,
                hash: this.hash
            })
        },
        donateReply: function (item) {
            var data = {
                source: "reply",
                name: "回复",
                address: item.author,
                hash: item.hash
            }
            // alert(JSON.stringify(data))
            this.donate(data)
        },
        donate: function (source) {
            var args = [{
                address: source.address,
                hash: source.hash,
                source: source.source,
                sourceName: source.name
            }]
            var _this = this
            var defaultNas = (Math.random() * (0.01 - 0.0001) + 0.0001).toFixed(4)
            this.$prompt("请输入你的打赏金额，单位：NAS", "打赏", {
                confirmButtonText: "打赏",
                inputValue: defaultNas,
            }).then(function (value) {
                var data = {
                    address: app.contractAddress,
                    value: value.value,
                    func: "donate",
                    data: args,
                    context: _this,
                    successMsg: "已成功打赏" + (source.name ? source.name : "作者") + "！",
                    successFunc: function (resp) {
                        _this.fetchTopic()
                    },
                }
                _this.$eventHub.$emit("nebPayCall", data)
            }).catch(function () {
                
            })

        },
        favTopic: function () {

            var _this = this

            var data = {
                address: app.contractAddress,
                value: 0,
                func: "addFavTopic",
                data: [this.hash],
                context: this,
                successMsg: "收藏主题成功！",
                successFunc: function (resp) {
                    _this.fetchTopic()
                },
            }

            this.$eventHub.$emit("nebPayCall", data)
        },
        addContent: function () {
            this.$router.push({
                name: "addTopic",
                query: {
                    action: "addContent",
                    hash: this.hash,
                    title: this.topic.title
                }
            })
        },
        submitReply: function (form) {

            var _this = this
            if (!app.user.nickName) {
                return this.$message.error("请先完善用户信息");
            }

            this.reply.content = this.editor.getMarkdown()

            if (this.reply.content.length < 5) {
                return this.$message.error("回复内容不得少于5个字符");
            }

            var data = {
                address: app.contractAddress,
                value: 0,
                func: "addReply",
                data: [this.reply],
                context: this,
                successMsg: "添加回复成功！",
                successFunc: function (resp) {
                    _this.replyList = {
                        total: 0,
                        reply: []
                    }
                    // _this.replyOffset = 0
                    _this.fetchReplyList()
                },
            }

            this.$eventHub.$emit("nebPayCall", data)

        },
        loadingMore: function () {
            this.replyListLoading = true
            this.replyOffset += this.replyLimit
            if (this.replyList.total && this.replyOffset > this.replyList.total) {
                this.replyOffset = this.replyList.total
            }
            this.loadingMoreText = "正在加载"
            this.fetchReplyList()
        },
        fetchReplyList: function () {
            var _this = this

            nasApi.call({
                chainID: nebState.chain_id,
                from: app.address || chainInfo.contractAddress,
                to: chainInfo.contractAddress,
                value: 0,
                // nonce: nonce,
                gasPrice: 1000000,
                gasLimit: 2000000,
                contract: {
                    function: "replyList",
                    args: JSON.stringify([this.hash, this.replyLimit, this.replyOffset])
                }
            }).then(function (resp) {
                var result = JSON.parse(resp.result)
                _this.replyListLoading = false
                if (!result) {
                    return
                }
                _this.replyList.total = result.total
                if (result.reply.length) {
                    _this.loadingMoreText = "加载更多"
                    // _this.replyList.reply = _this.replyList.reply.concat(result.reply)
                    for (var i = 0; i < result.reply.length; i++) {
                        var item = result.reply[i]
                        _this.replyList.reply.push(item)
                    }
                } else {
                    _this.loadingMoreText = "没有更多数据"
                }

            })
        }
    },
    watch: {
        "$route.params": function () {
            location.reload()
        }
    },
    created: function () {
        this.fetchTopic()
        this.fetchReplyList()
    },
    data: function () {
        var hash = this.$route.params.hash
        return {
            hash: hash,
            loading: true,
            replyListLoading: false,
            editor: null,
            loadingMoreText: "加载更多",
            replyOffset: 0,
            replyLimit: 10,
            topic: null,
            replyList: {
                total: 0,
                reply: []
            },
            reply: {
                topicHash: hash,
                content: ""
            }
        }
    }
}
var AboutComponent = {
    template: '#about-tpl',
}
var UserSettingComponent = {
    template: '#user-setting-tpl',
    methods: {
        submitUser: function () {
            var _this = this
            // if (!this.userInfo.avatar) {
            //     return this.$message.error("请输入头像地址，可以使用新浪微博的头像 URL")
            // }
            if (this.userInfo.avatar && this.userInfo.avatar.substr(0, 8) != "https://") {
                return this.$message.error("头像只支持 https:// 开头的 URL")
            }
            if (this.userInfo.nickName.length < 3) {
                return this.$message.error("昵称必须大于等于3个字符")
            }

            var data = {
                address: app.contractAddress,
                value: 0,
                func: "setUser",
                data: [this.userInfo],
                context: this,
                successMsg: "更新用户信息成功",
                successFunc: function (resp) {
                    location.reload()
                },
            }

            this.$eventHub.$emit("nebPayCall", data)

        },
        userUpdate: function (user) {
            this.userInfo = JSON.parse(JSON.stringify(user))
        }
    },
    computed: {
        loading: function () {
            return !app.userLoad
        }
    },
    beforeDestroy: function () {
        this.$eventHub.$off('userUpdate');
    },
    data: function () {
        this.$eventHub.$on("userUpdate", this.userUpdate)
        var userInfo = JSON.parse(JSON.stringify(app.user))
        return {
            userInfoRules: {},
            userInfo: userInfo,
            value8: ''
        }
    }
}

var routes = [{
        path: '/',
        component: HomeComponent,
        name: "home",
        props: {
            page: "home"
        }
    },
    {
        path: '/user/:hash?/topic',
        component: HomeComponent,
        name: "myTopic",
        props: {
            page: "myTopic"
        }
    },
    {
        path: '/my/fllow',
        component: MyFllowComponent,
        name: "myFllow"
    },
    {
        path: '/my/reply',
        component: MyReplyComponent,
        name: "myReply"
    },
    {
        path: '/donate/received',
        component: MyReceivedDonateComponent,
        name: "myReceivedDonate"
    },
    {
        path: '/donate',
        component: MyDonateComponent,
        name: "myDonate"
    },
    {
        path: '/fav/topic',
        component: HomeComponent,
        name: "favTopic",
        props: {
            page: "favTopic"
        }
    },
    {
        path: '/category',
        component: CategoryListComponent,
        name: "categoryList"
    },
    {
        path: '/fav/category',
        component: FavCategoryListComponent,
        name: "favCategory"
    },
    {
        path: '/c/:slug',
        component: HomeComponent,
        name: "category",
        props: {
            page: "category"
        }
    },
    {
        path: '/topic/add',
        component: AddTopicComponent,
        name: "addTopic"
    },
    {
        path: '/topic/:hash',
        component: TopicComponent,
        name: "topic"
    },
    {
        path: '/user/setting',
        component: UserSettingComponent,
        name: "userSetting"
    },
    {
        path: '/about',
        component: AboutComponent,
        name: "about"
    },
]

var router = new VueRouter({
    routes: routes
})

function getErrMsg(err) {
    var msg = ""
    if (err == 'Error: 403') {
        msg = "权限禁止"
    } else if (err == 'Error: 10001') {
        msg = "栏目未找到"
    } else if (err == 'Error: 10005') {
        msg = "用户未注册"
    } else if (err == 'Error: 10003') {
        msg = "offset 参数大于数据长度"
    } else if (err == 'Error: 10004') {
        msg = "已关注此用户"
    } else if (err == 'Error: 10006') {
        msg = "当前注册用户需要支付一定的 NAS，你支付的NAS错误！"
    } else if (err == 'Error: 10008') {
        msg = "帖子标题长度必须大于5个字符"
    } else if (err == 'Error: 10009') {
        msg = "发帖时必须选择栏目"
    } else if (err == 'Error: 10010') {
        msg = "栏目已存在"
    } else if (err == 'Error: 10011') {
        msg = "回复内容太短"
    } else if (err == 'Error: 10012') {
        msg = "打赏金额错误"
    } else if (err == 'Error: 10013') {
        msg = "已经收藏该栏目"
    } else if (err == 'Error: 10014') {
        msg = "已经收藏该主题"
    } else if (err == 'Error: 10015') {
        msg = "未找到此主题"
    } else if (err == 'Error: 10016') {
        msg = "内容不能为空"
    } else if (err == 'Error: 10017') {
        msg = "不能自己关注自己"
    } else if (err == 'Error: 10018') {
        msg = "未关注此用户"
    } else if (err == 'Error: 10019') {
        msg = "该昵称已存在"
    } else if (err == 'Error: 10020') {
        msg = "昵称必须大于等于3个字符"
    } else if (err == 'Error: 10021') {
        msg = "此栏目只有对应的管理员可以发帖"
    } else if (err == 'Error: 10022') {
        msg = "用户在黑名单"
    } else if (err == 'Error: 10023') {
        msg = "用户地址余额小于最小NAS要求（防止恶意用户发帖）"
    } else if (err == 'Error: 10024') {
        msg = "充值金额错误"
    }
    return msg
}


Vue.prototype.$eventHub = new Vue({
    created: function () {
        this.$on("checkTransaction", this.checkTransaction)
        this.$on("nebPayCall", this.nebPayCall)
    },
    methods: {
        fllowUser: function (user) {
            var _this = this

            var data = {
                address: app.contractAddress,
                value: 0,
                func: "fllow",
                data: [user.address],
                context: this,
                successMsg: "关注用户成功！",
                successFunc: function (resp) {
                    location.reload()
                },
            }

            this.$eventHub.$emit("nebPayCall", data)
        },
        nebPayCall: function (config) {
            var options = config.options,
                serialNumber = "",
                _this = this;

            if (!options) {
                options = {
                    callback: chainInfo.payhost,
                    listener: function (value) {
                        // mylog("listener:", value, serialNumber)
                        // console.log(value)
                        if (typeof value == 'string') {
                            _this.$notify({
                                title: '错误',
                                message: '用户取消了交易！',
                                duration: 3000,
                                type: 'error'
                            });
                            return
                        }

                        config.serialNumber = serialNumber
                        config.txhash = value.txhash

                        config.transStateNotify = _this.$notify({
                            title: '正在获取交易状态',
                            message: '如你不想等待状态查询，可点击关闭按钮。稍后刷新页面查看最新信息！',
                            duration: 0,
                            type: 'warning'
                        });

                        _this.checkTransaction(config)

                        // this.$eventHub.$emit("checkTransaction", config)
                    }
                }
            }


            serialNumber = nebPay.call(
                config.address,
                config.value,
                config.func,
                JSON.stringify(config.data),
                options
            );

            mylog("生成的serialNumber：", serialNumber)

        },
        checkTransaction: function (config) {
            // var config = {
            //     serialNumber:serialNumber,
            //     successMsg:"更新信息成功",
            //     successFunc:this.xxxxx,
            //     context: this
            // }
            var serialNumber = config.serialNumber,
                context = config.context,
                minInterval = 6,
                intervalTime = config.intervalTime || minInterval,
                timeOut = config.timeOut || 60; //60秒后超时
            if (intervalTime < minInterval) { //API限制每分钟最多查询6次
                intervalTime = minInterval
            }
            var timeOutId = 0
            var timerId = setInterval(function () {
                // mylog("查询：", serialNumber)
                nasApi.getTransactionReceipt({
                    hash: config.txhash
                }).then(function (receipt) {
                    // status Transaction status, 0 failed, 1 success, 2 pending.
                    // mylog("receipt:",receipt)

                    if (receipt.status === 1) {
                        clearInterval(timerId)
                        config.transStateNotify.close()

                        if (timeOutId) {
                            clearTimeout(timeOutId)
                        }

                        if (config.successMsg) {
                            // context.$message.success(config.successMsg)
                            context.$notify({
                                title: '操作成功',
                                message: config.successMsg,
                                type: 'success'
                            });

                        }
                        // mylog(context)
                        if (config.successFunc) {
                            setTimeout(function () {
                                config.successFunc(receipt)
                            }, 300)

                        }
                    } else if (receipt.status === 0) { //错误
                        // "Error: 10008"
                        context.$message.error(getErrMsg(receipt.execute_result))
                        clearInterval(timerId)
                        config.transStateNotify.close()

                        if (timeOutId) {
                            clearTimeout(timeOutId)
                        }

                        if (config.failFunc) {
                            setTimeout(function () {
                                config.failFunc(receipt)
                            }, 300)

                        }
                    }
                }).catch(function (err) {
                    context.$message.error("查询交易结果发生了错误！" + err)
                });
            }, intervalTime * 1000)
            timeOutId = setTimeout(function () {
                config.transStateNotify.close()
                if (timerId) {
                    context.$message.error("查询超时！请稍后刷新页面查看最新内容！")
                    clearInterval(timerId)
                }
            }, timeOut * 1000)
        }
    },
    data: function () {
        return {
            categoryList: {
                total: 0,
                category: []
            }
        }
    }
});


var defaultData = {
    visible: true,
    activeIndex: 'home',
    nasApi: nasApi,
    balance: 0,
    account: null,
    address: "",
    nebState: null,
    userLoad: false,
    user: {
        avatar: "",
        nickName: "",
        weibo: "",
        twitter: "",
        facebook: "",
        bio: "",
        website: "",
        company: "",
        job: "",
        topicNums: 0,
        replyNums: 0,
        fllowNums: 0,
        fansNums: 0,
        favCategoryNums: 0,
        favTopicNums: 0,
    },
    categoryList: {
        total: 0,
        category: []
    },
    accountState: null,
    contractAddress: chainInfo.contractAddress,
    chainnetConfig: chainnetConfig,
    chainStr: chainInfo.name,
    chainnet: chain,
    bbsStatus: {
        userNums: 0,
        topicNums: 0,
        replyNums: 0
    }
}



var Main = {
    router: router,
    mounted: function () {
        this.fetchCategoryList()
        this.fetchBBSStatus()
        this.fetchHotTopic()
        this.fetchAdsList()
    },
    methods: {
        changChain: function (chain) {
            if (chain == "mainnet") {
                this.chainStr = "主网"
            } else if (chain == "testnet") {
                this.chainStr = "测试网"
            }
            this.chain = chain
            localStorage.setItem("chain", chain)
            location.reload()
        },
        fetchAccountState: function () {
            var _this = this;

            if (!app.address) {
                return
            }
            this.nasApi.getAccountState({
                address: app.address
            }).then(function (resp) {
                if (resp.error) {
                    this.$message.error(resp.error)
                }
                var amount = Unit.fromBasic(Utils.toBigNumber(resp.balance), "nas").toNumber()
                app.balance = amount

                _this.accountState = resp
            });
        },
        fetchBBSStatus: function () {
            var _this = this
            nasApi.call({
                chainID: nebState.chain_id,
                from: chainInfo.contractAddress,
                to: chainInfo.contractAddress,
                value: 0,
                // nonce: nonce,
                gasPrice: 1000000,
                gasLimit: 2000000,
                contract: {
                    function: "bbsStatus",
                    args: JSON.stringify()
                }
            }).then(function (resp) {
                var result = JSON.parse(resp.result)
                if (result) {
                    _this.bbsStatus = result
                }
            })
        },
        fetchHotTopic: function () {
            var _this = this
            nasApi.call({
                chainID: nebState.chain_id,
                from: chainInfo.contractAddress,
                to: chainInfo.contractAddress,
                value: 0,
                // nonce: nonce,
                gasPrice: 1000000,
                gasLimit: 2000000,
                contract: {
                    function: "hotTopicList",
                    args: JSON.stringify([6])
                }
            }).then(function (resp) {
                var result = JSON.parse(resp.result)
                if (result) {
                    _this.hotTopics = result
                }
            })
        },
        fetchCategoryList: function () {
            var _this = this

            nasApi.call({
                chainID: nebState.chain_id,
                from: chainInfo.contractAddress,
                to: chainInfo.contractAddress,
                value: 0,
                // nonce: nonce,
                gasPrice: 1000000,
                gasLimit: 2000000,
                contract: {
                    function: "categoryList",
                    args: JSON.stringify()
                }
            }).then(function (resp) {
                var result = JSON.parse(resp.result)
                if (result) {
                    _this.categoryList = result
                    _this.$eventHub.categoryList = result
                    _this.sortCategoryByTopicNums(result)
                }
            })
        },
        sortCategoryByTopicNums: function (result) {
            var category = result.category,
                hotCategory = [];
            for (var i = 0; i < category.length; i++) {
                var item = category[i];
                hotCategory.push(item)
            }
            hotCategory.sort(function (n, p) {
                return p.topicNums > n.topicNums
            })
            this.hotCategory = hotCategory
        },
        fetchUserInfo: function () {
            var _this = this;
            nasApi.call({
                chainID: app.nebState.chain_id,
                from: app.address,
                to: app.contractAddress,
                value: 0,
                // nonce: nonce,
                gasPrice: 1000000,
                gasLimit: 2000000,
                contract: {
                    function: "getUser",
                    args: JSON.stringify([app.address, false])
                }
            }).then(function (resp) {
                _this.userLoad = true
                var result = JSON.parse(resp.result)
                if (result) {
                    _this.user = result
                    _this.$eventHub.$emit("userUpdate", result)
                }
            })
        },
        updateUserInfo: function () {
            this.fetchUserInfo()
            this.fetchAccountState()
        },
        showMenu: function () {
            var style = this.menuStatus ? "display:none" : "display:block"
            document.getElementById("left-menu").style = style
            document.getElementById("right-menu").style = style

            this.menuStatus = !this.menuStatus
        },
        fetchAdsList: function () {
            var _this = this
            nasApi.call({
                chainID: nebState.chain_id,
                from: chainInfo.contractAddress,
                to: chainInfo.contractAddress,
                value: 0,
                // nonce: nonce,
                gasPrice: 1000000,
                gasLimit: 2000000,
                contract: {
                    function: "getAds",
                    args: JSON.stringify()
                }
            }).then(function (resp) {
                var result = JSON.parse(resp.result)
                if (result) {
                    _this.ads = result
                }
            })
        }

    },
    watch: {
        address: function (n) {
            mylog("watch address :" + n)
            localStorage.setItem('address', n)
            this.updateUserInfo()
        }
    },
    data: function () {
        defaultData.hotCategory = []
        defaultData.ads = []
        defaultData.hotTopics = {
            lastUpdate: "",
            topics: []
        }
        var address = localStorage.getItem('address') || ""
        defaultData.address = address
        defaultData.menuStatus = false
        defaultData.noExtension = typeof (webExtensionWallet) === "undefined"
        return defaultData
    }
}

var defaultAvatar = 'data:image/png;base64,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'

Vue.filter("dateFormat", function (value) {
    var date = new Date(value * 1000)
    return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
})
Vue.filter("buildAvatar", function (value) {
    if (!value) {
        return defaultAvatar
    }
    return value
})
var hiddenTopic = {
    "c3d9e390d54f224a6636a12445e3be85b28914d431f7788c8150a904b1e2b86f":true
}
Vue.mixin({
    methods: {
        checkHiddenTopic: function (hash) {
            if (hiddenTopic[hash]) {
                return false
            }
            return true
        }
    }
})

// md 转换为 HTML
// function contentFormat(value) {
//     return markdown.toHTML(value)
// }

// Vue.filter("contentFormat", contentFormat)

Vue.filter("fromBasicNas", function (value) {
    return Unit.fromBasic(Utils.toBigNumber(value, "nas")).toNumber()
})

// var 

function editormdFormat(id, markdown) {
    // console.log(id,markdown)
    setTimeout(function () {
        // console.log(document.getElementById(id))
        var ele = document.getElementById(id)
        if (ele && ele.innerHTML != "") {
            // console.log(111111)
            return
        }
        editormd.markdownToHTML(id, {
            markdown: markdown, //+ "\r\n" + $("#append-test").text(),
            //htmlDecode      : true,       // 开启 HTML 标签解析，为了安全性，默认不开启
            // htmlDecode      : "style,script,iframe",  // you can filter tags decode
            //toc             : false,
            atLink: false,
            // autoLoadKaTeX:false,
            // tocm            : true,    // Using [TOCM]
            //tocContainer    : "#custom-toc-container", // 自定义 ToC 容器层
            // gfm             : true,
            //tocDropdown     : true,
            // markdownSourceCode : true, // 是否保留 Markdown 源码，即是否删除保存源码的 Textarea 标签
            // emoji           : true,
            taskList: true,
            // tex             : true,  // 默认不解析
            // flowChart       : true,  // 默认不解析
            // sequenceDiagram : true,  // 默认不解析
        });
    }, 0)
    // return "xxxx"
}

// Vue.$message

nasApi.getNebState().then(function (state) {
    defaultData.nebState = state
    nebState = state

    cls = Vue.extend(Main)
    app = new cls()

    getWallectInfo()

    app.$mount('#app')
})

function getWallectInfo() {
    window.addEventListener('message', function (e) {
        if (e.data && e.data.data) {
            mylog("e.data.data:", e.data.data)
            if (e.data.data.account) {
                app.address = e.data.data.account
                app.updateUserInfo()
            }
        }
    })

    window.postMessage({
        "target": "contentscript",
        "data": {},
        "method": "getAccount",
    }, "*");
}