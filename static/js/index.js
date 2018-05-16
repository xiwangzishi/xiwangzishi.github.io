var nebulas = require("nebulas"),
    NebPay = require("nebpay"),
    HttpRequest = nebulas.HttpRequest,
    Neb = nebulas.Neb,
    Account = nebulas.Account,
    Transaction = nebulas.Transaction,
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

var AddTopicComponent = {
    template: '#add-topic-tpl',
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
                    _this.replyList.reply = _this.replyList.reply.concat(result.reply)
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
]

var router = new VueRouter({
    routes: routes
})

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
                        mylog("listener:", value, serialNumber)
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
                            }, 500)

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
            this.hotCategory = hotCategory.slice(0, 7)
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

// md 转换为 HTML
function contentFormat(value) {
    return markdown.toHTML(value)
}

Vue.filter("contentFormat", contentFormat)

Vue.filter("fromBasicNas", function (value) {
    return Unit.fromBasic(Utils.toBigNumber(value, "nas")).toNumber()
})




nasApi.getNebState().then(function (state) {
    defaultData.nebState = state
    nebState = state

    cls = Vue.extend(Main)
    app = new cls()

    getWallectInfo()

    app.$mount('#app')
})

function getWallectInfo() {

    window.postMessage({
        "target": "contentscript",
        "data": {},
        "method": "getAccount",
    }, "*");

    window.addEventListener('message', function (e) {
        if (e.data && e.data.data) {
            mylog("e.data.data:", e.data.data)
            if (e.data.data.account) {
                app.address = e.data.data.account
                app.updateUserInfo()
            }
        }
    })
}