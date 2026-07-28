import {
    ArrowRight,
    Check,
    Copy,
    ExternalLink,
    Github,
    Heart,
    MessageSquare,
    Send,
    Twitter,
    Wallet,
    Reply,
    ThumbsUp,
    X,
    DollarSign,
    Plus,
    Hash,
    Pin,
    LogOut,
    Bell,
    Sparkles,
    Globe,
    Users,
    TrendingUp,
    Calendar,
    Boxes,
    Image,
    Zap,
    Rocket,
    Award,
    Star,
} from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";

interface DonateViewProps {
    onBackToHome: () => void;
    activeBlock: number;
}

const WALLET_ADDRESS =
    "ckb1qzdcr9un5ezx8tkh03s46m9jymh22jruelq8svzr5krj2nx69dhjvqgjnwwhj6rdh5x73h663l9zdnxpntqzu5enqqj48cah";

// Mock data - replace with real data from your backend
const RECENT_DONATIONS = [
    {
        donor: "ckb1...9n2k",
        amount: "12,500",
        time: "2 min ago",
        initials: "9N",
    },
    {
        donor: "ckb1...7x4m",
        amount: "5,000",
        time: "18 min ago",
        initials: "7X",
    },
    {
        donor: "Anonymous",
        amount: "2,500",
        time: "1 hr ago",
        initials: "AN",
    },
];

const NEWS_ITEMS = [
    {
        id: "1",
        title: "Corven v2.0 Beta Released",
        description: "New developer tools and improved performance",
        date: "2 days ago",
        category: "Release",
        icon: Sparkles,
        color: "blue",
    },
    {
        id: "2",
        title: "CKB Integration Complete",
        description: "Full support for CKB smart contracts",
        date: "5 days ago",
        category: "Integration",
        icon: Globe,
        color: "green",
    },
    {
        id: "3",
        title: "Community Hits 500 Members",
        description: "Thank you for your support!",
        date: "1 week ago",
        category: "Community",
        icon: Users,
        color: "purple",
    },
    {
        id: "4",
        title: "Funding Round Opens",
        description: "Help us build the future of CKB development",
        date: "2 weeks ago",
        category: "Funding",
        icon: TrendingUp,
        color: "orange",
    },
];

interface Topic {
    id: string;
    title: string;
    author: string;
    avatar: string;
    content: string;
    timestamp: string;
    replies: Comment[];
    likes: number;
    pinned: boolean;
    category: string;
}

interface Comment {
    id: string;
    author: string;
    avatar: string;
    content: string;
    timestamp: string;
    likes: number;
    replies: Reply[];
}

interface Reply {
    id: string;
    author: string;
    avatar: string;
    content: string;
    timestamp: string;
    likes: number;
}

// Mock topics data
const INITIAL_TOPICS: Topic[] = [
    {
        id: "1",
        title: "What features would you like to see in Corven?",
        author: "Alice Chen",
        avatar: "AC",
        content: "I'm curious what the community thinks would be the most impactful features for Corven. Let's discuss!",
        timestamp: "2 hours ago",
        likes: 15,
        pinned: true,
        category: "Feature Discussion",
        replies: [
            {
                id: "1-1",
                author: "Bob Smith",
                avatar: "BS",
                content: "A built-in debugger would be amazing for CKB development.",
                timestamp: "1 hour ago",
                likes: 8,
                replies: [
                    {
                        id: "1-1-1",
                        author: "Carol White",
                        avatar: "CW",
                        content: "Yes! Especially with smart contract debugging capabilities.",
                        timestamp: "45 min ago",
                        likes: 3,
                    }
                ],
            },
            {
                id: "1-2",
                author: "David Kim",
                avatar: "DK",
                content: "Better integration with CKB explorer would be great.",
                timestamp: "30 min ago",
                likes: 5,
                replies: [],
            },
        ],
    },
    {
        id: "2",
        title: "CKB ecosystem growth - what's working and what isn't?",
        author: "Elena Rodriguez",
        avatar: "ER",
        content: "Let's discuss the current state of the CKB ecosystem and how Corven can help accelerate growth.",
        timestamp: "4 hours ago",
        likes: 10,
        pinned: false,
        category: "Ecosystem",
        replies: [
            {
                id: "2-1",
                author: "Frank Martin",
                avatar: "FM",
                content: "Developer onboarding needs improvement. Better documentation would help.",
                timestamp: "3 hours ago",
                likes: 6,
                replies: [],
            },
        ],
    },
    {
        id: "3",
        title: "How should we prioritize development efforts?",
        author: "Grace Lee",
        avatar: "GL",
        content: "With limited resources, what should be our top priorities for the next quarter?",
        timestamp: "6 hours ago",
        likes: 7,
        pinned: false,
        category: "Roadmap",
        replies: [],
    },
];

// Mock general feedback
const GENERAL_FEEDBACK: Comment[] = [
    {
        id: "gf1",
        author: "Henry Wang",
        avatar: "HW",
        content: "Love the transparency in how funds are used. This is how open-source should work!",
        timestamp: "8 hours ago",
        likes: 12,
        replies: [
            {
                id: "gf1-1",
                author: "Ivy Zhang",
                avatar: "IZ",
                content: "Absolutely agree! The community support has been amazing.",
                timestamp: "7 hours ago",
                likes: 4,
                replies: [],
            },
        ],
    },
    {
        id: "gf2",
        author: "Jack Liu",
        avatar: "JL",
        content: "The interface is clean and professional. Great work on the design!",
        timestamp: "10 hours ago",
        likes: 9,
        replies: [],
    },
];

type TabType = "donate" | "talks" | "news";
type TalkTabType = "topics" | "general";

const CAPACITY_CELLS = 24;

function CapacityMeter({ percent }: { percent: number }) {
    const filled = Math.round((percent / 100) * CAPACITY_CELLS);
    return (
        <div className="flex gap-[3px]">
            {Array.from({ length: CAPACITY_CELLS }).map((_, i) => {
                const isFilled = i < filled;
                const isEdge = i === filled - 1;
                return (
                    <div
                        key={i}
                        className={`h-3 flex-1 rounded-[2px] transition-colors ${isFilled
                            ? isEdge
                                ? "bg-[var(--cv-amber)] shadow-[0_0_8px_rgba(242,169,60,0.3)]"
                                : "bg-[var(--cv-amber)]"
                            : "bg-gray-100 border border-gray-200"
                            }`}
                    />
                );
            })}
        </div>
    );
}

// Color mapping for categories
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    "Feature Discussion": { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
    "Ecosystem": { bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
    "Roadmap": { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200" },
    "General": { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
    "Release": { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
    "Integration": { bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
    "Community": { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200" },
    "Funding": { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200" },
};

// Hero image - using a gradient with icons as a decorative element
const HeroImage = () => (
    <div className="relative h-full w-full min-h-[200px] rounded-2xl overflow-hidden bg-gradient-to-br from-[#2dd4bf]/20 via-blue-500/10 to-purple-500/20 border border-gray-200">
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
                {/* Decorative floating elements */}
                <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="absolute -top-12 -left-12 text-blue-400/30"
                >
                    <Boxes className="h-24 w-24" />
                </motion.div>
                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                    className="absolute -bottom-8 -right-8 text-purple-400/30"
                >
                    <Rocket className="h-20 w-20" />
                </motion.div>
                <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#2dd4bf]/40"
                >
                    <Zap className="h-32 w-32" />
                </motion.div>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-16 right-12 text-yellow-400/20"
                >
                    <Star className="h-16 w-16" />
                </motion.div>
                <motion.div
                    animate={{ x: [0, 15, 0] }}
                    transition={{ duration: 5, repeat: Infinity }}
                    className="absolute bottom-12 left-8 text-pink-400/20"
                >
                    <Award className="h-12 w-12" />
                </motion.div>
                <div className="relative z-10 flex flex-col items-center justify-center p-8 text-center">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-sm px-4 py-2 shadow-lg border border-gray-200">
                        <Sparkles className="h-5 w-5 text-[#2dd4bf]" />
                        <span className="text-sm font-semibold text-gray-900">Open Source. Community First.</span>
                    </div>
                    <div className="mt-4 flex gap-3">
                        <div className="rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 shadow-lg border border-gray-200">
                            <span className="text-xs font-mono text-gray-700">🚀 500+ Developers</span>
                        </div>
                        <div className="rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 shadow-lg border border-gray-200">
                            <span className="text-xs font-mono text-gray-700">⭐ 2.3k Stars</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        {/* Decorative grid pattern */}
        <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, #000 1px, transparent 0)`,
                backgroundSize: '20px 20px',
            }}
        />
    </div>
);

export default function DonateView({ onBackToHome, activeBlock }: DonateViewProps) {
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>("donate");
    const [talkSubTab, setTalkSubTab] = useState<TalkTabType>("topics");

    const [topics, setTopics] = useState<Topic[]>(INITIAL_TOPICS);
    const [newTopicTitle, setNewTopicTitle] = useState("");
    const [newTopicContent, setNewTopicContent] = useState("");
    const [showNewTopicForm, setShowNewTopicForm] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

    const [generalComments, setGeneralComments] = useState<Comment[]>(GENERAL_FEEDBACK);
    const [feedback, setFeedback] = useState("");
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

    const [replyContent, setReplyContent] = useState<{ [key: string]: string }>({});
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [likedItems, setLikedItems] = useState<Set<string>>(new Set());

    const [walletConnected, setWalletConnected] = useState(false);
    const [walletAddress, setWalletAddress] = useState("ckb1...abc123");

    const formattedBlock = useMemo(
        () => new Intl.NumberFormat("en-GB").format(activeBlock),
        [activeBlock],
    );

    const copyAddress = async () => {
        try {
            await navigator.clipboard.writeText(WALLET_ADDRESS);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    const handleConnectWallet = () => {
        setWalletConnected(true);
    };

    const handleDisconnectWallet = () => {
        setWalletConnected(false);
    };

    const handleTopicSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTopicTitle.trim() && newTopicContent.trim()) {
            const newTopic: Topic = {
                id: Date.now().toString(),
                title: newTopicTitle,
                author: "You",
                avatar: "YO",
                content: newTopicContent,
                timestamp: "Just now",
                likes: 0,
                pinned: false,
                category: "General",
                replies: [],
            };
            setTopics([newTopic, ...topics]);
            setNewTopicTitle("");
            setNewTopicContent("");
            setShowNewTopicForm(false);
        }
    };

    const handleGeneralFeedbackSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (feedback.trim()) {
            const newComment: Comment = {
                id: Date.now().toString(),
                author: "You",
                avatar: "YO",
                content: feedback,
                timestamp: "Just now",
                likes: 0,
                replies: [],
            };
            setGeneralComments([newComment, ...generalComments]);
            setFeedback("");
            setFeedbackSubmitted(true);
            setTimeout(() => setFeedbackSubmitted(false), 3000);
        }
    };

    const handleReplySubmit = (parentId: string, isTopic: boolean = false, topicId?: string) => {
        const replyText = replyContent[parentId];
        if (replyText?.trim()) {
            const newReply: Reply = {
                id: `${parentId}-${Date.now()}`,
                author: "You",
                avatar: "YO",
                content: replyText,
                timestamp: "Just now",
                likes: 0,
                replies: [],
            };

            if (isTopic && topicId) {
                setTopics(topics.map(topic => {
                    if (topic.id === topicId) {
                        return {
                            ...topic,
                            replies: topic.replies.map(reply => {
                                if (reply.id === parentId) {
                                    return {
                                        ...reply,
                                        replies: [...reply.replies, newReply],
                                    };
                                }
                                return reply;
                            }),
                        };
                    }
                    return topic;
                }));
            } else if (isTopic) {
                setTopics(topics.map(topic => {
                    if (topic.id === parentId) {
                        return {
                            ...topic,
                            replies: [...topic.replies, {
                                id: `reply-${Date.now()}`,
                                author: "You",
                                avatar: "YO",
                                content: replyText,
                                timestamp: "Just now",
                                likes: 0,
                                replies: [],
                            }],
                        };
                    }
                    return topic;
                }));
            } else {
                setGeneralComments(generalComments.map(comment => {
                    if (comment.id === parentId) {
                        return {
                            ...comment,
                            replies: [...comment.replies, newReply],
                        };
                    }
                    return comment;
                }));
            }

            setReplyContent({ ...replyContent, [parentId]: "" });
            setReplyingTo(null);
        }
    };

    const handleLike = (itemId: string, type: 'topic' | 'comment' | 'reply', parentId?: string) => {
        const likeKey = type === 'reply' ? `${parentId}-${itemId}` : itemId;

        if (likedItems.has(likeKey)) {
            setLikedItems(prev => {
                const newSet = new Set(prev);
                newSet.delete(likeKey);
                return newSet;
            });

            if (type === 'topic') {
                setTopics(topics.map(topic => {
                    if (topic.id === itemId) {
                        return { ...topic, likes: topic.likes - 1 };
                    }
                    return topic;
                }));
            } else if (type === 'comment' && parentId) {
                setTopics(topics.map(topic => {
                    if (topic.id === parentId) {
                        return {
                            ...topic,
                            replies: topic.replies.map(reply => {
                                if (reply.id === itemId) {
                                    return { ...reply, likes: reply.likes - 1 };
                                }
                                return reply;
                            }),
                        };
                    }
                    return topic;
                }));
            } else if (type === 'reply' && parentId) {
                setTopics(topics.map(topic => {
                    if (topic.id === parentId) {
                        return {
                            ...topic,
                            replies: topic.replies.map(reply => {
                                if (reply.id === itemId) {
                                    return {
                                        ...reply,
                                        replies: reply.replies.map(r => {
                                            if (r.id === itemId) {
                                                return { ...r, likes: r.likes - 1 };
                                            }
                                            return r;
                                        }),
                                    };
                                }
                                return reply;
                            }),
                        };
                    }
                    return topic;
                }));
            }
        } else {
            setLikedItems(prev => new Set(prev).add(likeKey));

            if (type === 'topic') {
                setTopics(topics.map(topic => {
                    if (topic.id === itemId) {
                        return { ...topic, likes: topic.likes + 1 };
                    }
                    return topic;
                }));
            } else if (type === 'comment' && parentId) {
                setTopics(topics.map(topic => {
                    if (topic.id === parentId) {
                        return {
                            ...topic,
                            replies: topic.replies.map(reply => {
                                if (reply.id === itemId) {
                                    return { ...reply, likes: reply.likes + 1 };
                                }
                                return reply;
                            }),
                        };
                    }
                    return topic;
                }));
            } else if (type === 'reply' && parentId) {
                setTopics(topics.map(topic => {
                    if (topic.id === parentId) {
                        return {
                            ...topic,
                            replies: topic.replies.map(reply => {
                                if (reply.id === itemId) {
                                    return {
                                        ...reply,
                                        replies: reply.replies.map(r => {
                                            if (r.id === itemId) {
                                                return { ...r, likes: r.likes + 1 };
                                            }
                                            return r;
                                        }),
                                    };
                                }
                                return reply;
                            }),
                        };
                    }
                    return topic;
                }));
            }
        }
    };

    const renderTopicDetail = (topic: Topic) => {
        const colors = CATEGORY_COLORS[topic.category] || CATEGORY_COLORS["General"];

        return (
            <div className="space-y-6">
                <button
                    onClick={() => setSelectedTopic(null)}
                    className="inline-flex items-center gap-2 text-sm font-medium text-[var(--cv-accent)] hover:text-[var(--cv-accent-hover)]"
                >
                    <ArrowRight className="h-4 w-4 rotate-180" />
                    Back to topics
                </button>

                <div className="border-b border-gray-200 pb-6">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--cv-accent-soft)] text-[var(--cv-accent)] font-serif text-base font-semibold">
                                {topic.avatar}
                            </div>
                            <div>
                                <h2 className="text-2xl font-serif font-bold text-gray-900">{topic.title}</h2>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                    <span className="text-sm font-medium text-gray-700">{topic.author}</span>
                                    <span className="text-sm text-gray-400">•</span>
                                    <span className="text-sm text-gray-400">{topic.timestamp}</span>
                                    <span className="text-sm text-gray-400">•</span>
                                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
                                        <Hash className="h-3 w-3" />
                                        {topic.category}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <p className="mt-4 text-base leading-relaxed text-gray-800">
                        {topic.content}
                    </p>

                    <div className="mt-4 flex items-center gap-6">
                        <button
                            onClick={() => handleLike(topic.id, 'topic')}
                            className={`inline-flex items-center gap-2 text-sm font-medium transition ${likedItems.has(topic.id) ? "text-[var(--cv-accent)]" : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            <ThumbsUp className="h-4 w-4" />
                            {topic.likes}
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    {topic.replies.map((reply) => (
                        <div key={reply.id} className="border-l-2 border-gray-200 pl-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--cv-accent-soft)] text-[var(--cv-accent)] font-serif text-xs font-semibold">
                                    {reply.avatar}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">{reply.author}</p>
                                    <p className="text-xs text-gray-400">{reply.timestamp}</p>
                                </div>
                            </div>
                            <p className="mt-2 text-sm text-gray-700">{reply.content}</p>
                            <div className="mt-2 flex items-center gap-4">
                                <button
                                    onClick={() => handleLike(reply.id, 'comment', topic.id)}
                                    className={`inline-flex items-center gap-1 text-xs transition ${likedItems.has(reply.id) ? "text-[var(--cv-accent)]" : "text-gray-500 hover:text-gray-700"
                                        }`}
                                >
                                    <ThumbsUp className="h-3 w-3" />
                                    {reply.likes}
                                </button>
                                <button
                                    onClick={() => setReplyingTo(replyingTo === reply.id ? null : reply.id)}
                                    className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                                >
                                    <Reply className="h-3 w-3" />
                                    Reply
                                </button>
                            </div>

                            {replyingTo === reply.id && (
                                <div className="mt-3 flex gap-2">
                                    <input
                                        type="text"
                                        value={replyContent[reply.id] || ""}
                                        onChange={(e) => setReplyContent({
                                            ...replyContent,
                                            [reply.id]: e.target.value,
                                        })}
                                        placeholder="Write a reply..."
                                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--cv-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--cv-accent-soft)]"
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                handleReplySubmit(reply.id, true, topic.id);
                                            }
                                        }}
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => handleReplySubmit(reply.id, true, topic.id)}
                                        disabled={!replyContent[reply.id]?.trim()}
                                        className="cv-btn-primary rounded-lg px-3 py-2 text-sm disabled:opacity-40"
                                    >
                                        Reply
                                    </button>
                                    <button
                                        onClick={() => setReplyingTo(null)}
                                        className="cv-btn-ghost rounded-lg px-3 py-2 text-sm"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}

                            {reply.replies.length > 0 && (
                                <div className="mt-4 space-y-4 border-l-2 border-gray-200 pl-6">
                                    {reply.replies.map((nestedReply) => (
                                        <div key={nestedReply.id}>
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--cv-accent-soft)] text-[var(--cv-accent)] font-serif text-xs font-semibold">
                                                    {nestedReply.avatar}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">{nestedReply.author}</p>
                                                    <p className="text-xs text-gray-400">{nestedReply.timestamp}</p>
                                                </div>
                                            </div>
                                            <p className="mt-1 text-sm text-gray-700">{nestedReply.content}</p>
                                            <button
                                                onClick={() => handleLike(nestedReply.id, 'reply', reply.id)}
                                                className={`mt-2 inline-flex items-center gap-1 text-xs transition ${likedItems.has(nestedReply.id) ? "text-[var(--cv-accent)]" : "text-gray-500 hover:text-gray-700"
                                                    }`}
                                            >
                                                <ThumbsUp className="h-3 w-3" />
                                                {nestedReply.likes}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="border-t border-gray-200 pt-6">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={replyContent[`topic-${topic.id}`] || ""}
                            onChange={(e) => setReplyContent({
                                ...replyContent,
                                [`topic-${topic.id}`]: e.target.value,
                            })}
                            placeholder="Add a comment..."
                            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--cv-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--cv-accent-soft)]"
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleReplySubmit(topic.id, true);
                                }
                            }}
                        />
                        <button
                            onClick={() => handleReplySubmit(topic.id, true)}
                            disabled={!replyContent[`topic-${topic.id}`]?.trim()}
                            className="cv-btn-primary rounded-lg px-4 py-2 text-sm disabled:opacity-40"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Merriweather:wght@400;700;900&family=JetBrains+Mono:wght@400;500&display=swap');

                .cv-root {
                    --cv-accent: #2dd4bf;
                    --cv-accent-hover: #25b6a3;
                    --cv-accent-soft: rgba(45, 212, 191, 0.10);
                    --cv-amber: #f2a93c;
                    --cv-live: #34d399;
                    --cv-blue: #3b82f6;
                    --cv-purple: #8b5cf6;
                    --cv-pink: #ec4899;
                    --cv-orange: #f59e0b;
                }

                .cv-root .font-serif {
                    font-family: 'Merriweather', 'Times New Roman', serif;
                }

                .cv-root .font-sans {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                }

                .cv-root .font-mono {
                    font-family: 'JetBrains Mono', 'Fira Code', monospace;
                }

                .cv-root .cv-btn-primary {
                    background: var(--cv-accent);
                    color: #04211d;
                    font-weight: 600;
                    transition: background-color 0.15s ease;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }
                .cv-root .cv-btn-primary:hover:not(:disabled) { background: var(--cv-accent-hover); }

                .cv-root .cv-btn-ghost {
                    background: transparent;
                    border: 1px solid #e5e7eb;
                    color: #6b7280;
                    transition: all 0.15s ease;
                }
                .cv-root .cv-btn-ghost:hover { color: #1f2937; border-color: #d1d5db; }

                .cv-root .cv-panel {
                    background: white;
                    border: 1px solid #e5e7eb;
                }

                /* Colorful accent classes */
                .cv-accent-blue { color: #3b82f6; }
                .cv-accent-green { color: #10b981; }
                .cv-accent-purple { color: #8b5cf6; }
                .cv-accent-orange { color: #f59e0b; }
                .cv-accent-pink { color: #ec4899; }
                .cv-accent-red { color: #ef4444; }

                .cv-bg-blue-soft { background: rgba(59, 130, 246, 0.08); }
                .cv-bg-green-soft { background: rgba(16, 185, 129, 0.08); }
                .cv-bg-purple-soft { background: rgba(139, 92, 246, 0.08); }
                .cv-bg-orange-soft { background: rgba(245, 158, 11, 0.08); }
                .cv-bg-pink-soft { background: rgba(236, 72, 153, 0.08); }
            `}</style>

            <main className="min-h-screen">
                {/* Header */}
                <header className="border-b border-gray-200 bg-white shadow-sm">
                    <div className="mx-auto max-w-8xl px-6 py-4">
                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                onClick={onBackToHome}
                                className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
                            >
                                <ArrowRight className="h-4 w-4 rotate-180" />
                                Back to Corven
                            </button>

                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-1.5 text-xs font-mono font-medium text-gray-600">
                                    <span className="relative flex h-2 w-2">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--cv-live)] opacity-75"></span>
                                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--cv-live)]"></span>
                                    </span>
                                    CKB #{formattedBlock}
                                </div>

                                {walletConnected ? (
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5">
                                            <div className="h-2 w-2 rounded-full bg-[var(--cv-live)]"></div>
                                            <code className="font-mono text-xs text-gray-900">
                                                {walletAddress}
                                            </code>
                                        </div>
                                        <button
                                            onClick={handleDisconnectWallet}
                                            className="cv-btn-ghost rounded-lg px-3 py-1.5 text-xs font-medium"
                                        >
                                            <LogOut className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleConnectWallet}
                                        className="cv-btn-primary flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs"
                                    >
                                        <Wallet className="h-3.5 w-3.5" />
                                        Connect Wallet
                                    </button>
                                )}

                                <a
                                    href="https://github.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-400 transition hover:text-gray-700"
                                >
                                    <Github className="h-5 w-5" />
                                </a>
                                <a
                                    href="https://twitter.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-400 transition hover:text-[#1DA1F2]"
                                >
                                    <Twitter className="h-5 w-5" />
                                </a>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Hero Section with Image */}
                <div className="border-b border-gray-200 bg-white">
                    <div className="mx-auto max-w-8xl px-6 py-12">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className="inline-flex items-center gap-2 rounded-full bg-[var(--cv-accent-soft)] border border-[var(--cv-accent)] px-3 py-1 text-xs font-mono font-medium text-[var(--cv-accent)]">
                                        <Boxes className="h-3 w-3" />
                                        OPEN-SOURCE FUNDING
                                    </div>
                                    <div className="flex items-center gap-2 ml-2 text-xs text-gray-500">
                                        <Bell className="h-3.5 w-3.5" />
                                        <span>2 updates</span>
                                    </div>
                                </div>
                                <h1 className="font-serif mt-4 text-4xl font-black leading-[1.1] tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                                    Fund the tools that
                                    <span className="text-[var(--cv-accent)]"> move CKB forward.</span>
                                </h1>
                                <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600 font-sans">
                                    Every donation helps us improve Corven, ship better developer tooling,
                                    and keep the platform open and accessible to the CKB community.
                                </p>
                                <div className="mt-6 flex gap-3">
                                    <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        Built with ❤️
                                    </div>
                                    <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-600 border border-purple-200">
                                        <Users className="h-3.5 w-3.5" />
                                        500+ Community
                                    </div>
                                </div>
                            </div>
                            <div className="lg:pl-4">
                                <HeroImage />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="mx-auto max-w-8xl px-6 py-8">
                    <div className="flex gap-8">
                        {/* Sidebar */}
                        <div className="w-56 shrink-0">
                            <div className="sticky top-20 space-y-6">
                                {/* Navigation */}
                                <div className="space-y-1">
                                    <button
                                        onClick={() => setActiveTab("donate")}
                                        className={`w-full flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition font-sans ${activeTab === "donate"
                                            ? "bg-[var(--cv-accent)] text-white shadow-lg shadow-[var(--cv-accent)]/20"
                                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                            }`}
                                    >
                                        <DollarSign className="h-4 w-4" />
                                        Donate
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("talks")}
                                        className={`w-full flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition font-sans ${activeTab === "talks"
                                            ? "bg-[var(--cv-accent)] text-white shadow-lg shadow-[var(--cv-accent)]/20"
                                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                            }`}
                                    >
                                        <MessageSquare className="h-4 w-4" />
                                        Talks
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("news")}
                                        className={`w-full flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition font-sans ${activeTab === "news"
                                            ? "bg-[var(--cv-accent)] text-white shadow-lg shadow-[var(--cv-accent)]/20"
                                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                            }`}
                                    >
                                        <Bell className="h-4 w-4" />
                                        News
                                        <span className="ml-auto text-xs bg-[var(--cv-accent-soft)] px-1.5 py-0.5 rounded-full text-[var(--cv-accent)] font-mono">4</span>
                                    </button>
                                </div>

                                {/* Recent Donations */}
                                <div className="cv-panel rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-semibold text-gray-700 font-sans tracking-wide">
                                            RECENT DONATIONS
                                        </h3>
                                        <span className="flex items-center gap-1 rounded-full bg-[var(--cv-accent-soft)] px-1.5 py-0.5 text-[8px] font-mono font-medium text-[var(--cv-accent)]">
                                            <span className="h-1 w-1 animate-pulse rounded-full bg-[var(--cv-live)]" />
                                            LIVE
                                        </span>
                                    </div>
                                    <div className="mt-2 space-y-1.5">
                                        {RECENT_DONATIONS.map((donation) => (
                                            <div
                                                key={`${donation.donor}-${donation.time}`}
                                                className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-2 py-1.5 hover:border-[var(--cv-accent)]/30 transition-colors"
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--cv-accent-soft)] font-mono text-[8px] font-semibold text-[var(--cv-accent)]">
                                                        {donation.initials}
                                                    </div>
                                                    <div>
                                                        <p className="font-mono text-[8px] font-medium text-gray-900">
                                                            {donation.donor}
                                                        </p>
                                                        <p className="text-[7px] text-gray-400">{donation.time}</p>
                                                    </div>
                                                </div>
                                                <p className="font-mono text-[8px] font-semibold text-[var(--cv-live)]">
                                                    +{donation.amount}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="cv-panel rounded-xl p-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500">Total Raised</span>
                                            <span className="font-mono font-semibold text-[var(--cv-accent)]">64,200 CKB</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500">Supporters</span>
                                            <span className="font-mono font-semibold text-[var(--cv-blue)]">28</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500">Goal</span>
                                            <span className="font-mono font-semibold text-[var(--cv-purple)]">100,000 CKB</span>
                                        </div>
                                        <div className="mt-3">
                                            <CapacityMeter percent={64} />
                                        </div>
                                        <div className="text-right text-[10px] font-mono text-gray-400">64% capacity filled</div>
                                    </div>
                                </div>

                                {/* Quick Tip */}
                                <div className="rounded-xl bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border border-gray-200 p-4">
                                    <div className="flex items-center gap-2">
                                        <Zap className="h-4 w-4 text-[var(--cv-accent)]" />
                                        <span className="text-xs font-semibold text-gray-700">Quick Tip</span>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                                        Every donation directly supports Corven's development and the CKB ecosystem.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                            {activeTab === "donate" ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="cv-panel rounded-xl p-6">
                                        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 font-sans">
                                            <Wallet className="h-4 w-4 text-[var(--cv-accent)]" />
                                            Corven Support Wallet
                                        </div>

                                        <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                                            <code className="font-mono min-w-0 flex-1 truncate text-sm text-gray-900">
                                                {WALLET_ADDRESS}
                                            </code>
                                            <div className="flex shrink-0 items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={copyAddress}
                                                    aria-label="Copy wallet address"
                                                    className="cv-btn-ghost rounded-lg p-1.5"
                                                >
                                                    {copied ? (
                                                        <Check className="h-4 w-4 text-[var(--cv-live)]" />
                                                    ) : (
                                                        <Copy className="h-4 w-4" />
                                                    )}
                                                </button>
                                                <a
                                                    href={`https://explorer.nervos.org/address/${WALLET_ADDRESS}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    aria-label="View wallet on explorer"
                                                    className="cv-btn-ghost rounded-lg p-1.5"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={copyAddress}
                                            className="cv-btn-primary mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[var(--cv-accent)] focus:ring-offset-2"
                                        >
                                            {copied ? (
                                                <>
                                                    <Check className="h-4 w-4" />
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    Copy Wallet Address
                                                    <Copy className="h-4 w-4" />
                                                </>
                                            )}
                                        </button>

                                        {/* Donation impact */}
                                        <div className="mt-6 grid grid-cols-3 gap-3">
                                            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-center">
                                                <p className="text-xs font-mono text-blue-600">5,000 CKB</p>
                                                <p className="text-[10px] text-gray-500 mt-0.5">Buys coffee ☕</p>
                                            </div>
                                            <div className="rounded-lg bg-purple-50 border border-purple-200 p-3 text-center">
                                                <p className="text-xs font-mono text-purple-600">25,000 CKB</p>
                                                <p className="text-[10px] text-gray-500 mt-0.5">Supports a feature 🚀</p>
                                            </div>
                                            <div className="rounded-lg bg-pink-50 border border-pink-200 p-3 text-center">
                                                <p className="text-xs font-mono text-pink-600">100,000 CKB</p>
                                                <p className="text-[10px] text-gray-500 mt-0.5">Funds a milestone 🏆</p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : activeTab === "news" ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 rounded-full bg-[var(--cv-accent-soft)]">
                                            <Bell className="h-5 w-5 text-[var(--cv-accent)]" />
                                        </div>
                                        <h2 className="font-serif text-xl font-bold text-gray-900">Latest News</h2>
                                    </div>

                                    <div className="space-y-4">
                                        {NEWS_ITEMS.map((item) => {
                                            const colorMap = {
                                                blue: { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-500" },
                                                green: { bg: "bg-green-50", border: "border-green-200", icon: "text-green-500" },
                                                purple: { bg: "bg-purple-50", border: "border-purple-200", icon: "text-purple-500" },
                                                orange: { bg: "bg-orange-50", border: "border-orange-200", icon: "text-orange-500" },
                                            };
                                            const colors = colorMap[item.color as keyof typeof colorMap] || colorMap.blue;

                                            return (
                                                <motion.div
                                                    key={item.id}
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="cv-panel rounded-xl p-4 hover:shadow-md transition-all hover:border-[var(--cv-accent)]/30"
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${colors.bg} border ${colors.border} ${colors.icon}`}>
                                                            <item.icon className="h-5 w-5" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-3 flex-wrap">
                                                                <h3 className="font-serif text-base font-bold text-gray-900">
                                                                    {item.title}
                                                                </h3>
                                                                <span className={`text-xs px-2 py-0.5 rounded-full font-sans font-medium ${colors.bg} ${colors.icon} border ${colors.border}`}>
                                                                    {item.category}
                                                                </span>
                                                            </div>
                                                            <p className="mt-1 text-sm text-gray-600 font-sans">{item.description}</p>
                                                            <div className="mt-2 flex items-center gap-2 text-xs text-gray-400 font-sans">
                                                                <Calendar className="h-3 w-3" />
                                                                <span>{item.date}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {/* Talk Sub-tabs */}
                                    <div className="flex gap-6 border-b border-gray-200 font-sans">
                                        <button
                                            onClick={() => setTalkSubTab("topics")}
                                            className={`px-1 py-3 text-sm font-medium transition border-b-2 ${talkSubTab === "topics"
                                                ? "border-[var(--cv-accent)] text-[var(--cv-accent)]"
                                                : "border-transparent text-gray-500 hover:text-gray-900"
                                                }`}
                                        >
                                            Topics ({topics.length})
                                        </button>
                                        <button
                                            onClick={() => setTalkSubTab("general")}
                                            className={`px-1 py-3 text-sm font-medium transition border-b-2 ${talkSubTab === "general"
                                                ? "border-[var(--cv-accent)] text-[var(--cv-accent)]"
                                                : "border-transparent text-gray-500 hover:text-gray-900"
                                                }`}
                                        >
                                            General Feedback ({generalComments.length})
                                        </button>
                                    </div>

                                    {talkSubTab === "topics" ? (
                                        selectedTopic ? (
                                            renderTopicDetail(selectedTopic)
                                        ) : (
                                            <div className="pt-6">
                                                <div className="flex items-center justify-between mb-6">
                                                    <div>
                                                        <h2 className="font-serif text-xl font-bold text-gray-900">
                                                            Discussion Topics
                                                        </h2>
                                                        <p className="text-sm text-gray-600 font-sans">
                                                            Start a new discussion or join existing conversations
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => setShowNewTopicForm(!showNewTopicForm)}
                                                        className="cv-btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-sans shadow-lg shadow-[var(--cv-accent)]/20"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                        New Topic
                                                    </button>
                                                </div>

                                                {showNewTopicForm && (
                                                    <form onSubmit={handleTopicSubmit} className="cv-panel mb-6 rounded-xl p-4 border-[var(--cv-accent)]/30">
                                                        <div className="space-y-3">
                                                            <input
                                                                type="text"
                                                                value={newTopicTitle}
                                                                onChange={(e) => setNewTopicTitle(e.target.value)}
                                                                placeholder="Topic title..."
                                                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--cv-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--cv-accent-soft)]"
                                                                required
                                                            />
                                                            <textarea
                                                                value={newTopicContent}
                                                                onChange={(e) => setNewTopicContent(e.target.value)}
                                                                placeholder="What would you like to discuss?"
                                                                rows={3}
                                                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--cv-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--cv-accent-soft)]"
                                                                required
                                                            />
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="submit"
                                                                    className="cv-btn-primary rounded-lg px-4 py-2 text-sm font-sans"
                                                                >
                                                                    Create Topic
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowNewTopicForm(false)}
                                                                    className="cv-btn-ghost rounded-lg px-4 py-2 text-sm font-sans"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </form>
                                                )}

                                                <div className="divide-y divide-gray-200">
                                                    {topics.map((topic) => {
                                                        const colors = CATEGORY_COLORS[topic.category] || CATEGORY_COLORS["General"];
                                                        return (
                                                            <motion.div
                                                                key={topic.id}
                                                                initial={{ opacity: 0, y: 5 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                className="cursor-pointer py-4 transition hover:bg-gray-50 -mx-4 px-4 rounded-lg group"
                                                                onClick={() => setSelectedTopic(topic)}
                                                            >
                                                                <div className="flex items-start justify-between">
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            {topic.pinned && (
                                                                                <Pin className="h-4 w-4 text-[var(--cv-accent)]" />
                                                                            )}
                                                                            <h3 className="font-serif text-base font-bold text-gray-900 group-hover:text-[var(--cv-accent)] transition-colors">
                                                                                {topic.title}
                                                                            </h3>
                                                                        </div>
                                                                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                                            <span className="text-sm text-gray-700 font-sans">{topic.author}</span>
                                                                            <span className="text-sm text-gray-400">•</span>
                                                                            <span className="text-sm text-gray-500 font-sans">{topic.timestamp}</span>
                                                                            <span className="text-sm text-gray-400">•</span>
                                                                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-sans font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
                                                                                <Hash className="h-3 w-3" />
                                                                                {topic.category}
                                                                            </span>
                                                                        </div>
                                                                        <p className="mt-1 text-sm text-gray-600 font-sans line-clamp-1">
                                                                            {topic.content}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex items-center gap-4 text-sm text-gray-500 font-sans ml-4">
                                                                        <span className="flex items-center gap-1 group-hover:text-[var(--cv-accent)] transition-colors">
                                                                            <MessageSquare className="h-4 w-4" />
                                                                            {topic.replies.length}
                                                                        </span>
                                                                        <span className="flex items-center gap-1 group-hover:text-[var(--cv-accent)] transition-colors">
                                                                            <ThumbsUp className="h-4 w-4" />
                                                                            {topic.likes}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    ) : (
                                        <div className="pt-6">
                                            <div className="flex items-center justify-between mb-6">
                                                <div>
                                                    <h2 className="font-serif text-xl font-bold text-gray-900">
                                                        General Feedback
                                                    </h2>
                                                    <p className="text-sm text-gray-600 font-sans">
                                                        Share general thoughts about the project
                                                    </p>
                                                </div>
                                                <span className="rounded-full bg-gray-100 px-3 py-0.5 text-sm font-mono font-medium text-gray-600">
                                                    {generalComments.length} {generalComments.length === 1 ? 'post' : 'posts'}
                                                </span>
                                            </div>

                                            <form onSubmit={handleGeneralFeedbackSubmit} className="mb-8">
                                                <div className="flex gap-3">
                                                    <input
                                                        type="text"
                                                        value={feedback}
                                                        onChange={(e) => setFeedback(e.target.value)}
                                                        placeholder="Share your feedback..."
                                                        className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[var(--cv-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--cv-accent-soft)]"
                                                        disabled={feedbackSubmitted}
                                                    />
                                                    <button
                                                        type="submit"
                                                        disabled={!feedback.trim() || feedbackSubmitted}
                                                        className="cv-btn-primary inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-sans disabled:cursor-not-allowed disabled:opacity-40 shadow-lg shadow-[var(--cv-accent)]/20"
                                                    >
                                                        {feedbackSubmitted ? (
                                                            <>
                                                                <Check className="h-4 w-4" />
                                                                Sent
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Send className="h-4 w-4" />
                                                                Post
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                                {feedbackSubmitted && (
                                                    <p className="mt-2 text-sm text-[var(--cv-live)] font-sans">
                                                        ✓ Thanks for your feedback!
                                                    </p>
                                                )}
                                            </form>

                                            <div className="divide-y divide-gray-200">
                                                {generalComments.length > 0 ? (
                                                    generalComments.map((comment) => (
                                                        <motion.div
                                                            key={comment.id}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className="py-6"
                                                        >
                                                            <div className="flex items-start gap-4">
                                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--cv-accent-soft)] text-[var(--cv-accent)] font-serif text-sm font-semibold">
                                                                    {comment.avatar}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-3">
                                                                        <p className="text-sm font-semibold text-gray-900 font-sans">
                                                                            {comment.author}
                                                                        </p>
                                                                        <span className="text-sm text-gray-400">•</span>
                                                                        <span className="text-sm text-gray-500 font-sans">{comment.timestamp}</span>
                                                                    </div>
                                                                    <p className="mt-2 text-sm leading-relaxed text-gray-800 font-sans">
                                                                        {comment.content}
                                                                    </p>
                                                                    <div className="mt-3 flex items-center gap-4">
                                                                        <button className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[var(--cv-accent)] transition-colors font-sans">
                                                                            <ThumbsUp className="h-4 w-4" />
                                                                            {comment.likes}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                                                            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-[var(--cv-accent)] font-sans"
                                                                        >
                                                                            <Reply className="h-4 w-4" />
                                                                            Reply
                                                                            {comment.replies.length > 0 && ` (${comment.replies.length})`}
                                                                        </button>
                                                                    </div>

                                                                    {replyingTo === comment.id && (
                                                                        <div className="mt-3 flex gap-2">
                                                                            <input
                                                                                type="text"
                                                                                value={replyContent[comment.id] || ""}
                                                                                onChange={(e) => setReplyContent({
                                                                                    ...replyContent,
                                                                                    [comment.id]: e.target.value,
                                                                                })}
                                                                                placeholder="Write a reply..."
                                                                                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--cv-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--cv-accent-soft)]"
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === "Enter" && !e.shiftKey) {
                                                                                        e.preventDefault();
                                                                                        handleReplySubmit(comment.id, false);
                                                                                    }
                                                                                }}
                                                                                autoFocus
                                                                            />
                                                                            <button
                                                                                onClick={() => handleReplySubmit(comment.id, false)}
                                                                                disabled={!replyContent[comment.id]?.trim()}
                                                                                className="cv-btn-primary rounded-lg px-3 py-2 text-sm font-sans disabled:opacity-40"
                                                                            >
                                                                                Reply
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setReplyingTo(null)}
                                                                                className="cv-btn-ghost rounded-lg px-3 py-2 text-sm font-sans"
                                                                            >
                                                                                <X className="h-4 w-4" />
                                                                            </button>
                                                                        </div>
                                                                    )}

                                                                    {comment.replies.length > 0 && (
                                                                        <div className="mt-4 space-y-4 border-l-2 border-gray-200 pl-4">
                                                                            {comment.replies.map((reply) => (
                                                                                <motion.div
                                                                                    key={reply.id}
                                                                                    initial={{ opacity: 0, x: -10 }}
                                                                                    animate={{ opacity: 1, x: 0 }}
                                                                                >
                                                                                    <div className="flex items-start gap-3">
                                                                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--cv-accent-soft)] text-[var(--cv-accent)] font-serif text-xs font-semibold">
                                                                                            {reply.avatar}
                                                                                        </div>
                                                                                        <div className="flex-1 min-w-0">
                                                                                            <div className="flex items-center gap-3">
                                                                                                <p className="text-sm font-semibold text-gray-900 font-sans">
                                                                                                    {reply.author}
                                                                                                </p>
                                                                                                <span className="text-sm text-gray-400">•</span>
                                                                                                <span className="text-sm text-gray-500 font-sans">{reply.timestamp}</span>
                                                                                            </div>
                                                                                            <p className="mt-1 text-sm leading-relaxed text-gray-700 font-sans">
                                                                                                {reply.content}
                                                                                            </p>
                                                                                            <button className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[var(--cv-accent)] transition-colors font-sans">
                                                                                                <ThumbsUp className="h-4 w-4" />
                                                                                                {reply.likes}
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                </motion.div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    ))
                                                ) : (
                                                    <div className="py-16 text-center">
                                                        <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
                                                        <p className="mt-3 text-base font-medium text-gray-600 font-sans">No feedback yet</p>
                                                        <p className="text-sm text-gray-400 font-sans">Be the first to share your thoughts</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}