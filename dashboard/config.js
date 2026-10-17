module.exports = {
    images: {
        bannerUrl: '',
        footerImageUrl: 'https://yumi.onl/api/files/6acc1e04b73ec78bec87e49a/raw',
    },

    dashboard: {
        bannerUrl: 'https://yumi.onl/api/files/6ad053f0103d13955375d4d6/raw',
        footerImageUrl: '',

        blocks: [
            'Welcome to ***phase2***, your destination for quality ERLC designs, packages, and services. Founded in 2026.',
            'Use the buttons below to navigate the dashboard. If you need any help, click **"I need assistance"** to open a ticket with our support team.'
        ],

        buttons: [
            { type: 'page', page: 'guidelines', label: 'Guidelines' },
            { type: 'applications', label: 'Applications' },
            { type: 'ticket', kind: 'support', ticketType: 'general', label: 'I need assistance' },
            { type: 'link', url: 'https://www.roblox.com/communities/748604955', label: 'ROBLOX Group' },
        ],
    },

    pages: {
        guidelines: {
            bannerUrl: 'https://yumi.onl/api/files/6ad05724002c7721007c826d/raw',
            footerImageUrl: '',
            intro: '',
            items: [
                { emoji: '💬', title: 'Keep Channels On Topic', text: 'Use channels for what they\'re meant for. Keep design talk in design channels, support in support channels, and general conversations where they belong.' },
                { emoji: '🎨', title: 'Respect Creative Work', text: 'Don\'t steal, trace, copy, resell, or repost someone else\'s work without their permission.' },
                { emoji: '❌', title: 'No Drama', text: 'Keep outside drama and arguments out of Phase2. If something doesn\'t involve this community, it doesn\'t need to be brought here.' },
                { emoji: '🤝', title: 'Respect Everyone', text: 'Treat everyone with respect. Harassment, discrimination, threats, or purposely starting problems with others won\'t be tolerated.' },
                { emoji: '🚫', title: 'No Spam', text: 'Don\'t spam messages, mentions, reactions, images, or anything else that makes channels harder to use.' },
                { emoji: '👑', title: 'Use Common Sense', text: 'Not everything needs a written rule. Think before you post and don\'t try finding loopholes in the rules.' },
                { emoji: '📘', title: 'Staff Discretion', text: 'Staff can step in when something is causing problems in the community, even if there isn\'t a specific rule for it.' },
            ]
        }
    },

    applications: {
        bannerUrl: 'https://yumi.onl/api/files/6ad053f8103d13955375d4f1/raw',
        footerImageUrl: '',
        title: 'phase2 || Applications',
        description: 'Interested in joining the team? Pick a position below to apply. Answer every question honestly and in detail.',
        placeholder: 'Select a position to apply for',

        REVIEW_CHANNEL_ID: '1555741966820573304',
        REVIEWER_ROLE_IDS: ['1555741703980458084', '1555741675085762672'],
        DM_RESULTS: true,
        SESSION_MINUTES: 30,

        portfolio: {
            enabled: true,
            FORUM_CHANNEL_ID: '1555741888420642837', // your portfolio forum channel
            positions: ['designer'], // which positions get a portfolio
            servicesQuestion: 'What do you design?', // label of the question used for "Services"
            imageUrl: 'https://yumi.onl/api/files/6ad3fe9405ab7635c7298dfe/raw', // image shown on every portfolio
            imagePosition: 'bottom', // 'top' or 'bottom' of the container
            tagIds: [], // optional forum tag IDs to put on the thread
 
            // {name} = their display name, {mention} = @ping, {services} = their answer
            threadTitle: '{name}\'s Portfolio',
            title: 'Designer Portfolio',
            text: 'This portfolio belongs to {mention}. All images featured in this portfolio are the property of the designer and may not be reproduced, copied, or used in any form without prior permission.',
            ping: '{mention}, welcome to the team! This is your portfolio. Post your work here so clients can see what your previous work.',
        },


        positions: {
            designer: {
                label: 'Designer',
                emoji: '<:Pallet:1560066903333142530>',
                description: 'Create liveries, clothing, graphics, discord, or bots for clients.',
                open: true,
                requiredRoleIds: [],
                acceptAddRoleIds: ['1555741721873350667', '1555741720962928670'],
                acceptRemoveRoleIds: [],
                reviewerRoleIds: [],
                pingRoleIds: ['1555741703980458084', '1555741675085762672'],
                denyCooldownHours: 24,
                questions: [
                    { label: 'Age', style: 'short', required: true, maxLength: 3 },
                    { label: 'Timezone', style: 'short', required: true, maxLength: 50 },
                    { label: 'What do you design?', description: 'Liveries, clothing, graphics, etc.', style: 'short', required: true, maxLength: 200 },
                    { label: 'Portfolio', description: 'Links to your past work.', style: 'paragraph', required: true, maxLength: 1000 },
                    { label: 'Why do you want to join?', style: 'paragraph', required: true, minLength: 30, maxLength: 1000 },
                    { label: 'How active can you be?', description: 'Hours per week, days you\'re available.', style: 'short', required: true, maxLength: 200 },
                ],
            },
            support: {
                label: 'Support Team',
                emoji: '<:userquestion:1560094468198240357>',
                description: 'Help members with questions and keep the server running smoothely.',
                open: true,
                requiredRoleIds: [],
                acceptAddRoleIds: ['1555741711010111640', '1555741709516804188'],
                acceptRemoveRoleIds: [],
                reviewerRoleIds: [],
                pingRoleIds: ['1555741703980458084', '1555741675085762672'],
                denyCooldownHours: 24,
                questions: [
                    { label: 'Age', style: 'short', required: true, maxLength: 3 },
                    { label: 'Timezone', style: 'short', required: true, maxLength: 50 },
                    { label: 'Past experience', description: 'Other servers you\'ve been staff in.', style: 'paragraph', required: true, maxLength: 1000 },
                    { label: 'Why do you want to join?', style: 'paragraph', required: true, minLength: 30, maxLength: 1000 },
                ],
            }
        }
    }
}