module.exports = {
    MANAGER_ROLE_IDS: ['1555741681440260178', '1555741673550778369', '1555741672741277708'],

    LOG_CHANNEL_ID: '1555741983538946059',
    TRANSCRIPT_CHANNEL_ID: '1558685159358988390',
    REVIEW_CHANNEL_ID: '1555741897442467921',

    CLOSE_DELAY_SECONDS: 5,
    CLOSE_REQUEST_HOURS: 24,
    MAX_OPEN_PER_TYPE: 1,
    DM_ON_CLOSE: true,

    images: {
        bannerUrl: '',
        footerImageUrl: 'https://yumi.onl/api/files/6acc1e04b73ec78bec87e49a/raw',
    },

    display: {
        panel: { banner: true, footer: true },
        ticket: { banner: true, footer: true },
        notice: { banner: false, footer: true },
        transcript: { banner: false, footer: true },
        log: { banner: false, footer: false },
        dm: { banner: false, footer: true },
        review: { banner: false, footer: true },
    },

    priorities: {
        low: { label: 'Low', emoji: '🟢' },
        normal: { label: 'Normal', emoji: '🟡' },
        high: { label: 'High', emoji: '🟠' },
        urgent: { label: 'Urgent', emoji: '🔴' },
    },

    panels: {
        orders: {
            title: 'phase2 Orders',
            titleEmoji: '<:_cart:1558686089353625702>',
            description: 'Looking to order? Select the service you need below and a private order channel will be opened for you.',
            sections: [
                { emoji: '<:Pin:1475264700525580349>', title: 'Before Ordering', lines: ['Read our order terms', 'Have your references ready', 'Know your budget'] },
            ],
            placeholder: 'Select a service to order',
            bannerUrl: 'https://yumi.onl/api/files/6acc1e0bb73ec78bec87e4b2/raw',
            footerImageUrl: '',
        },
        support: {
            title: 'phase2 Assistance Center',
            titleEmoji: '<:person:1558686293876154401>',
            description: 'Welcome to phase2 Support. Please review the categories below, and select the type based on the support you need.',
            sections: [
                { emoji: '<:Globe:1558687254720020601>', title: 'General Support', lines: ['Questions & Inquiries', 'Giveaway Rewards', 'Customer Support'] },
                { emoji: '<:person:1558686293876154401>', title: 'Management Support', lines: ['Report a Staff Member', 'Report a User', 'Partnership Requests'] },
                { emoji: '<:person:1558686293876154401>', title: 'Executive Support', lines: ['Refund Requests', 'Important Issues', 'Appeals & Moderation Cases'] },
                { emoji: '<:paper:1558687126168535090>', title: 'Reminder', text: 'Before opening a ticket, please check the dashboard and the FAQ section to make sure your issue hasn\'t already been answered.' },
            ],
            placeholder: 'Select a category to open a ticket',
            bannerUrl: 'https://yumi.onl/api/files/6acc1e12b73ec78bec87e4c0/raw',
            footerImageUrl: '',
        },
    },

    orders: {
        intro: 'A new order has been opened. View information about it below.',

        rules: {
            requireTermsToClaim: true,
            openerCanClose: true,
            staffCanCloseUnclaimed: true,
        },

        terms: {
            enabled: true,
            text: 'Please accept our **Order Terms of Service** using the button below. Designers are not able to claim the order unless done so.',
            url: 'https://yumi.onl',
        },

        references: {
            enabled: true,
            threadName: 'References',
            message: 'Please attach references for your order.',
        },

        statuses: {
            pending: { label: 'Pending', emoji: '<:clock:1558669020880699542>' },
            in_progress: { label: 'In Progress', emoji: '<:PaintBrush:1558670092173180938>' },
            awaiting_payment: { label: 'Awaiting Payment', emoji: '<:money:1558670458654826577>' },
            completed: { label: 'Completed', emoji: '<:Checkmark:1558670921731149985>' },
        },

        reviews: {
            enabled: true,
        },

        services: {
            clothing: {
                label: 'Clothing',
                title: 'Clothing Order',
                emoji: '👕',
                description: 'Uniforms, shirts, and pants.',
                roleIds: ['1555741725748887715'],
                parentId: '1555741874092908574',
                channelPrefix: 'clothing',
                questions: [
                    { label: 'Budget', style: 'short', required: true, maxLength: 100 },
                    { label: 'Quantity', style: 'short', required: true, maxLength: 50 },
                    { label: 'Description', description: 'What do you need? Be as detailed as possible.', style: 'paragraph', required: true, maxLength: 1000 },
                ],
            },
            livery: {
                label: 'Livery',
                title: 'Livery Order',
                emoji: '🚓',
                description: 'Vehicle liveries, and decals',
                roleIds: ['1555741726650540032'],
                parentId: '1555741874092908574',
                channelPrefix: 'livery',
                questions: [
                    { label: 'Budget', style: 'short', required: true, maxLength: 100 },
                    { label: 'Quantity', style: 'short', required: true, maxLength: 50 },
                    { label: 'Description', style: 'paragraph', required: true, maxLength: 1000 },
                ],
            },
            graphics: {
                label: 'Graphics',
                title: 'Graphics Order',
                emoji: '🖼️',
                description: 'Banners, logos, and other graphics',
                roleIds: ['1555741724033425409'],
                parentId: '1555741874092908574',
                channelPrefix: 'graphics',
                questions: [
                    { label: 'Budget', style: 'short', required: true, maxLength: 100 },
                    { label: 'Quantity', style: 'short', required: true, maxLength: 50 },
                    { label: 'Description', style: 'paragraph', required: true, maxLength: 1000 },
                ],
            },
            botDevelopment: {
                label: 'Bot Development',
                title: 'Bot Development Order',
                emoji: '🤖',
                description: 'discord bot order',
                roleIds: ['1555741729855115338'],
                parentId: '1555741874092908574',
                channelPrefix: 'bot',
                questions: [
                    { label: 'Budget', style: 'short', required: true, maxLength: 100 },
                    { label: 'Quantity', style: 'short', required: true, maxLength: 50 },
                    { label: 'Description', style: 'paragraph', required: true, maxLength: 1000 },
                ],
            },
            discord: {
                label: 'Discord',
                title: 'Discord Order',
                emoji: '<:Discord:1475264607240327272>',
                description: 'discord server order',
                roleIds: ['1555741728705745067'],
                parentId: '1555741874092908574',
                channelPrefix: 'discord',
                questions: [
                    { label: 'Budget', style: 'short', required: true, maxLength: 100 },
                    { label: 'Quantity', style: 'short', required: true, maxLength: 50 },
                    { label: 'Description', style: 'paragraph', required: true, maxLength: 1000 },
                ],
            },
            els: {
                label: 'ELS',
                title: 'ELS Order',
                emoji: '🚨',
                description: 'ELS order',
                roleIds: ['1555741727560826982'],
                parentId: '1555741874092908574',
                channelPrefix: 'els',
                questions: [
                    { label: 'Budget', style: 'short', required: true, maxLength: 100 },
                    { label: 'Quantity', style: 'short', required: true, maxLength: 50 },
                    { label: 'Description', style: 'paragraph', required: true, maxLength: 1000 },
                ],
            },
        },
    },

    support: {
        intro: 'Thanks for reaching out! A member of our team will be with you shortly.',

        rules: {
            openerCanClose: true,
            staffCanCloseUnclaimed: true,
        },

        categories: {
            general: {
                label: 'General Support',
                title: 'General Support',
                emoji: '<:Globe:1558687254720020601>',
                description: 'Questions, giveaway rewards and customer support.',
                roleIds: ['1555741711010111640', '1555741703980458084', '1555741673550778369', '1555741672741277708'],
                parentId: '1555741875883737188',
                channelPrefix: 'general',
                questions: [
                    { label: 'Reason for opening', description: 'What do you need help with?', style: 'paragraph', required: true, maxLength: 1000 },
                ],
            },
            management: {
                label: 'Management Support',
                title: 'Management Support',
                emoji: '<:person:1558686293876154401>',
                description: 'Staff reports, user reports and partnerships.',
                roleIds: ['1555741703980458084', '1555741673550778369', '1555741672741277708'],
                parentId: '1555741875883737188',
                channelPrefix: 'management',
                questions: [
                    { label: 'Reason for opening', style: 'paragraph', required: true, maxLength: 1000 },
                    { label: 'Who is this about?', description: 'Usernames of anyone involved, if any.', style: 'short', required: false, maxLength: 200 },
                ],
            },
            executive: {
                label: 'Executive Support',
                title: 'Executive Support',
                emoji: '<:person:1558686293876154401>',
                description: 'Refunds, important issues and appeals.',
                roleIds: ['1555741673550778369', '1555741672741277708'],
                parentId: '1555741875883737188',
                channelPrefix: 'executive',
                questions: [
                    { label: 'Reason for opening', style: 'paragraph', required: true, maxLength: 1000 },
                    { label: 'Evidence', description: 'Links to screenshots or messages.', style: 'paragraph', required: false, maxLength: 800 },
                ],
            },
        },
    },
}