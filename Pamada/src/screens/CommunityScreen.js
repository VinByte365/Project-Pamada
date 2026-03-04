import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { ResizeMode, Video } from "expo-av";
import * as VideoThumbnails from "expo-video-thumbnails";
import ElevatedCard from "../components/ui/ElevatedCard";
import { useAuth } from "../contexts/AuthContext";
import { useCommunityPostUpload } from "../contexts/CommunityPostUploadContext";
import { useRealtime } from "../contexts/RealtimeContext";
import { useSnackbar } from "../contexts/SnackbarContext";
import { apiRequest } from "../utils/api";
import { radius, spacing, typography } from "../theme";
import useAppTheme from "../theme/useAppTheme";

export default function CommunityScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { palette } = useAppTheme();
  const { user, token } = useAuth();
  const { showSnackbar } = useSnackbar();
  const { upload, clearUpload } = useCommunityPostUpload();
  const { socket } = useRealtime();
  const { width } = useWindowDimensions();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [replyDrafts, setReplyDrafts] = useState({});
  const [activeReplyTarget, setActiveReplyTarget] = useState(null);
  const [videoThumbnails, setVideoThumbnails] = useState({});
  const [likesModal, setLikesModal] = useState({
    visible: false,
    users: [],
    loading: false,
    title: "Liked by",
  });
  const [viewer, setViewer] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [isViewerVideoPlaying, setIsViewerVideoPlaying] = useState(true);
  const [isViewerVideoEnded, setIsViewerVideoEnded] = useState(false);
  const viewerVideoRef = useRef(null);

  const myUserId = user?.id || user?._id;
  const isTablet = width >= 768;
  const mediaHeight = isTablet ? 320 : 220;
  const loadPosts = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiRequest("/api/v1/community/posts", {
        method: "GET",
        token,
      });
      setPosts(response?.data?.posts || []);
    } catch (error) {
      showSnackbar({ type: "error", message: error.message || "Failed to load community posts" });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useFocusEffect(
    React.useCallback(() => {
      loadPosts();
    }, [loadPosts]),
  );

  useEffect(() => {
    if (!socket) return;

    const countCommentTree = (list = []) =>
      list.reduce(
        (total, item) => total + 1 + countCommentTree(item.replies || []),
        0,
      );

    const hasCommentInTree = (list = [], commentId) =>
      list.some(
        (item) =>
          String(item.id) === String(commentId) ||
          hasCommentInTree(item.replies || [], commentId),
      );

    const addReplyToParent = (list = [], parentId, reply) => {
      let added = false;
      const next = list.map((item) => {
        if (String(item.id) === String(parentId)) {
          const exists = (item.replies || []).some(
            (entry) => String(entry.id) === String(reply.id),
          );
          if (exists) return item;
          added = true;
          return {
            ...item,
            replies: [...(item.replies || []), reply],
          };
        }
        if ((item.replies || []).length > 0) {
          const nested = addReplyToParent(item.replies || [], parentId, reply);
          if (nested.added) {
            added = true;
            return { ...item, replies: nested.list };
          }
        }
        return item;
      });
      return { list: next, added };
    };

    const updateCommentInTree = (list = [], updatedComment) =>
      list.map((item) => {
        if (String(item.id) === String(updatedComment.id)) {
          const merged = { ...item, ...updatedComment };
          // Preserve existing nested replies when backend update payload omits children.
          if ((!updatedComment.replies || updatedComment.replies.length === 0) && (item.replies || []).length > 0) {
            merged.replies = item.replies;
          }
          return merged;
        }
        if ((item.replies || []).length > 0) {
          return {
            ...item,
            replies: updateCommentInTree(item.replies, updatedComment),
          };
        }
        return item;
      });

    const removeCommentFromTree = (list = [], commentId) => {
      const countNode = (node) => 1 + countCommentTree(node.replies || []);
      let removedCount = 0;
      const next = [];
      list.forEach((item) => {
        if (String(item.id) === String(commentId)) {
          removedCount += countNode(item);
          return;
        }
        if ((item.replies || []).length > 0) {
          const nested = removeCommentFromTree(item.replies, commentId);
          removedCount += nested.removedCount;
          next.push({ ...item, replies: nested.list });
          return;
        }
        next.push(item);
      });
      return { list: next, removedCount };
    };

    const onCreated = (post) => {
      setPosts((prev) => [
        post,
        ...prev.filter((item) => String(item.id) !== String(post.id)),
      ]);
    };
    const onDeleted = ({ postId }) => {
      setPosts((prev) =>
        prev.filter((item) => String(item.id) !== String(postId)),
      );
    };
    const onUpdated = ({ postId, likes_count, comments_count }) => {
      setPosts((prev) =>
        prev.map((item) =>
          String(item.id) === String(postId)
            ? { ...item, likes_count, comments_count }
            : item,
        ),
      );
    };
    const onComment = (comment) => {
      setPosts((prev) =>
        prev.map((item) => {
          if (String(item.id) !== String(comment.post_id)) return item;
          const commentTree = item.comments || [];
          if (hasCommentInTree(commentTree, comment.id)) return item;

          let nextComments = commentTree;
          if (comment.parent_comment_id) {
            const nested = addReplyToParent(
              commentTree,
              comment.parent_comment_id,
              comment,
            );
            nextComments = nested.added
              ? nested.list
              : [...commentTree, comment];
          } else {
            nextComments = [...commentTree, comment];
          }

          return {
            ...item,
            comments: nextComments,
            comments_count: countCommentTree(nextComments),
          };
        }),
      );
    };
    const onCommentUpdated = (comment) => {
      setPosts((prev) =>
        prev.map((item) => {
          if (String(item.id) !== String(comment.post_id)) return item;
          return {
            ...item,
            comments: updateCommentInTree(item.comments || [], comment),
          };
        }),
      );
    };
    const onCommentDeleted = ({ post_id, comment_id }) => {
      setPosts((prev) =>
        prev.map((item) => {
          if (String(item.id) !== String(post_id)) return item;
          const result = removeCommentFromTree(item.comments || [], comment_id);
          const nextComments = result.list;
          return {
            ...item,
            comments: nextComments,
            comments_count: Math.max(
              0,
              (item.comments_count || 0) - result.removedCount,
            ),
          };
        }),
      );
    };

    socket.on("community:post_created", onCreated);
    socket.on("community:post_deleted", onDeleted);
    socket.on("community:post_updated", onUpdated);
    socket.on("community:comment_created", onComment);
    socket.on("community:comment_updated", onCommentUpdated);
    socket.on("community:comment_deleted", onCommentDeleted);

    return () => {
      socket.off("community:post_created", onCreated);
      socket.off("community:post_deleted", onDeleted);
      socket.off("community:post_updated", onUpdated);
      socket.off("community:comment_created", onComment);
      socket.off("community:comment_updated", onCommentUpdated);
      socket.off("community:comment_deleted", onCommentDeleted);
    };
  }, [socket]);

  const toggleLike = async (postId) => {
    setPosts((prev) =>
      prev.map((item) => {
        if (String(item.id) !== String(postId)) return item;
        const nextLiked = !item.is_liked;
        return {
          ...item,
          is_liked: nextLiked,
          likes_count: Math.max(
            0,
            (item.likes_count || 0) + (nextLiked ? 1 : -1),
          ),
        };
      }),
    );

    try {
      await apiRequest(`/api/v1/community/posts/${postId}/like`, {
        method: "POST",
        token,
      });
    } catch (error) {
      loadPosts();
    }
  };

  const sendComment = async (postId) => {
    const content = (commentDrafts[postId] || "").trim();
    if (!content) return;

    try {
      await apiRequest(`/api/v1/community/posts/${postId}/comments`, {
        method: "POST",
        token,
        body: JSON.stringify({ content }),
      });
      setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
    } catch (error) {
      showSnackbar({ type: "error", message: error.message || "Failed to add comment" });
    }
  };

  const saveEditedComment = async () => {
    if (!editingComment?.postId || !editingComment?.commentId) return;
    const content = String(editingComment.text || "").trim();
    if (!content) return;

    try {
      await apiRequest(
        `/api/v1/community/posts/${editingComment.postId}/comments/${editingComment.commentId}`,
        {
          method: "PUT",
          token,
          body: JSON.stringify({ content }),
        },
      );
      setEditingComment(null);
    } catch (error) {
      showSnackbar({ type: "error", message: error.message || "Failed to update comment" });
    }
  };

  const deleteComment = async (postId, commentId) => {
    try {
      await apiRequest(
        `/api/v1/community/posts/${postId}/comments/${commentId}`,
        {
          method: "DELETE",
          token,
        },
      );
    } catch (error) {
      showSnackbar({ type: "error", message: error.message || "Failed to delete comment" });
    }
  };

  const deletePost = async (postId) => {
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiRequest(`/api/v1/community/posts/${postId}`, {
              method: "DELETE",
              token,
            });
          } catch (error) {
            showSnackbar({ type: "error", message: error.message || "Failed to delete post" });
          }
        },
      },
    ]);
  };

  const toggleComments = (postId) => {
    setExpandedComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const openAuthorProfile = (postUserId) => {
    if (String(postUserId) === String(myUserId)) {
      navigation.navigate("Profile");
      return;
    }
    navigation.navigate("PublicProfile", { userId: postUserId });
  };

  const openPostLikes = async (postId) => {
    setLikesModal({
      visible: true,
      users: [],
      loading: true,
      title: "Post likes",
    });
    try {
      const response = await apiRequest(
        `/api/v1/community/posts/${postId}/likes`,
        {
          method: "GET",
          token,
        },
      );
      setLikesModal({
        visible: true,
        users: response?.data?.users || [],
        loading: false,
        title: "Post likes",
      });
    } catch (error) {
      setLikesModal({
        visible: true,
        users: [],
        loading: false,
        title: "Post likes",
      });
      showSnackbar({ type: "error", message: error.message || "Failed to load likes." });
    }
  };

  const orderedPosts = useMemo(
    () =>
      [...posts].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      ),
    [posts],
  );

  useEffect(() => {
    const loadVideoThumbnails = async () => {
      const updates = {};
      for (const post of orderedPosts) {
        if (
          post.media_type !== "video" ||
          !post.media_url ||
          videoThumbnails[post.id]
        )
          continue;
        try {
          const result = await VideoThumbnails.getThumbnailAsync(
            post.media_url,
            {
              time: 1200,
            },
          );
          updates[post.id] = result.uri;
        } catch (error) {
          // Fallback to icon view when thumbnail generation fails.
        }
      }
      if (Object.keys(updates).length > 0) {
        setVideoThumbnails((prev) => ({ ...prev, ...updates }));
      }
    };
    loadVideoThumbnails();
  }, [orderedPosts, videoThumbnails]);

  const toggleCommentLike = async (postId, commentId) => {
    const toggleInList = (list) =>
      list.map((comment) => {
        if (String(comment.id) === String(commentId)) {
          const nextLiked = !comment.is_liked;
          return {
            ...comment,
            is_liked: nextLiked,
            likes_count: Math.max(
              0,
              (comment.likes_count || 0) + (nextLiked ? 1 : -1),
            ),
          };
        }
        if (comment.replies?.length) {
          return { ...comment, replies: toggleInList(comment.replies) };
        }
        return comment;
      });

    setPosts((prev) =>
      prev.map((item) =>
        String(item.id) === String(postId)
          ? { ...item, comments: toggleInList(item.comments || []) }
          : item,
      ),
    );

    try {
      await apiRequest(
        `/api/v1/community/posts/${postId}/comments/${commentId}/like`,
        {
          method: "POST",
          token,
        },
      );
    } catch (error) {
      loadPosts();
    }
  };

  const sendReply = async (postId, commentId) => {
    const key = `${postId}:${commentId}`;
    const content = String(replyDrafts[key] || "").trim();
    if (!content) return;

    try {
      await apiRequest(
        `/api/v1/community/posts/${postId}/comments/${commentId}/replies`,
        {
          method: "POST",
          token,
          body: JSON.stringify({ content }),
        },
      );
      setReplyDrafts((prev) => ({ ...prev, [key]: "" }));
      setActiveReplyTarget(null);
    } catch (error) {
      showSnackbar({ type: "error", message: error.message || "Failed to add reply" });
    }
  };

  const openMediaViewer = (mediaType, mediaUrl) => {
    setIsViewerVideoPlaying(mediaType === "video");
    setIsViewerVideoEnded(false);
    setViewer({
      type: mediaType || "image",
      url: mediaUrl,
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadPosts();
    } finally {
      setRefreshing(false);
    }
  };

  const closeMediaViewer = async () => {
    try {
      await viewerVideoRef.current?.stopAsync();
    } catch (error) {
      // Ignore stop failures while closing.
    } finally {
      setViewer(null);
      setIsViewerVideoPlaying(true);
      setIsViewerVideoEnded(false);
    }
  };

  const showUploadBubble = upload.status !== "idle";
  const uploadBubbleTitle =
    upload.status === "success"
      ? "Upload complete"
      : upload.status === "error"
        ? "Upload failed"
        : "Publishing post";

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, styles.centeredContent]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
        >
          <View
            style={[
              styles.feedHeader,
              {
                backgroundColor: palette.surface.light,
                paddingTop: Math.max(spacing.lg, insets.top + spacing.sm),
              },
            ]}
          >
            <View style={styles.feedHeaderTextWrap}>
              <Text style={[styles.title, { color: palette.text.primary }]}>
                Community
              </Text>
              <Text
                style={[styles.subtitle, { color: palette.text.secondary }]}
              >
                Share Aloe Vera insights and connect with growers.
              </Text>
              <Text style={[styles.feedMeta, { color: palette.text.tertiary }]}>
                {posts.length} posts in feed
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.createPostBtn,
                { backgroundColor: palette.primary.solid },
              ]}
              onPress={() => navigation.navigate("CreateCommunityPost")}
            >
              <Ionicons
                name="create-outline"
                size={16}
                color={palette.primary.on}
              />
              <Text
                style={[styles.createPostText, { color: palette.primary.on }]}
              >
                New Blog
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ElevatedCard
              style={[styles.loadingCard]}
            >
              <Text style={[styles.loading, { color: palette.text.secondary }]}>
                Loading community feed...
              </Text>
            </ElevatedCard>
          ) : null}

          {!loading && orderedPosts.length === 0 ? (
            <ElevatedCard
              style={[
                styles.emptyCard,
                {
                  backgroundColor: palette.surface.light,
                },
              ]}
            >
              <Ionicons
                name="newspaper-outline"
                size={24}
                color={palette.text.tertiary}
              />
              <Text style={[styles.emptyTitle, { color: palette.text.primary }]}>
                No posts yet
              </Text>
              <Text
                style={[styles.emptyText, { color: palette.text.secondary }]}
              >
                Start the conversation by creating your first community blog
                post.
              </Text>
            </ElevatedCard>
          ) : null}

          {orderedPosts.map((post) => {
            const isPostOwner = String(post.user?.id) === String(myUserId);
            return (
              <ElevatedCard
                key={String(post.id)}
                style={[styles.postCard]}
              >
                <View
                  style={[
                    styles.postHeader,
                    {
                      borderBottomColor: palette.surface.border,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.authorRow}
                    onPress={() => openAuthorProfile(post.user.id)}
                  >
                    {post.user.profile_image_url ? (
                      <Image
                        source={{ uri: post.user.profile_image_url }}
                        style={styles.avatar}
                      />
                    ) : (
                      <View
                        style={[
                          styles.avatar,
                          { backgroundColor: `${palette.primary.solid}22` },
                        ]}
                      >
                        <Text
                          style={[
                            styles.avatarInitials,
                            { color: palette.primary.solid },
                          ]}
                        >
                          {post.user.full_name?.slice(0, 1).toUpperCase() ||
                            "U"}
                        </Text>
                      </View>
                    )}
                    <View>
                      <Text
                        style={[
                          styles.authorName,
                          { color: palette.text.primary },
                        ]}
                      >
                        {post.user.full_name}
                      </Text>
                      <Text
                        style={[
                          styles.timestamp,
                          { color: palette.text.secondary },
                        ]}
                      >
                        {new Date(post.created_at).toLocaleString([], {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {isPostOwner ? (
                    <TouchableOpacity onPress={() => deletePost(post.id)}>
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={palette.status.danger}
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <Text
                  style={[styles.postContent, { color: palette.text.primary }]}
                >
                  {post.content}
                </Text>

                {post.media_url ? (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() =>
                      openMediaViewer(
                        post.media_type || "image",
                        post.media_url,
                      )
                    }
                  >
                    {post.media_type === "video" ? (
                      <View style={styles.videoThumbWrap}>
                        {videoThumbnails[post.id] ? (
                          <Image
                            source={{ uri: videoThumbnails[post.id] }}
                            style={[styles.postMedia, { height: mediaHeight }]}
                          />
                        ) : (
                          <View
                            style={[
                              styles.videoPreviewWrap,
                              {
                                backgroundColor: palette.surface.soft,
                                height: mediaHeight,
                              },
                            ]}
                          >
                            <Ionicons
                              name="videocam-outline"
                              size={36}
                              color={palette.primary.solid}
                            />
                            <Text
                              style={[
                                styles.videoTapText,
                                { color: palette.text.secondary },
                              ]}
                            >
                              Loading preview...
                            </Text>
                          </View>
                        )}
                        <View style={styles.videoThumbOverlay}>
                          <Ionicons
                            name="play-circle"
                            size={44}
                            color="#FFFFFF"
                          />
                        </View>
                      </View>
                    ) : (
                      <Image
                        source={{ uri: post.media_url }}
                        style={[styles.postMedia, { height: mediaHeight }]}
                      />
                    )}
                  </TouchableOpacity>
                ) : null}

                <View style={styles.metaRow}>
                  <TouchableOpacity onPress={() => openPostLikes(post.id)}>
                    <Text
                      style={[
                        styles.metaText,
                        { color: palette.text.secondary },
                      ]}
                    >
                      {post.likes_count || 0} likes
                    </Text>
                  </TouchableOpacity>
                  <Text
                    style={[styles.metaText, { color: palette.text.secondary }]}
                  >
                    {post.comments_count || 0} comments
                  </Text>
                </View>

                <View
                  style={[
                    styles.actionRow,
                    {
                      borderTopColor: palette.surface.border,
                      borderBottomColor: palette.surface.border,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: palette.primary.solid,
                      },
                    ]}
                    onPress={() => toggleLike(post.id)}
                  >
                    <Ionicons
                      name={post.is_liked ? "heart" : "heart-outline"}
                      size={17}
                      color={post.is_liked ? "#FFFFFF" : palette.primary.on}
                    />
                    <Text
                      style={[
                        styles.actionText,
                        { color: palette.primary.on },
                      ]}
                    >
                      Like
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: palette.surface.soft,
                        borderWidth: 1,
                        borderColor: palette.surface.border,
                      },
                    ]}
                    onPress={() => toggleComments(post.id)}
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={17}
                      color={palette.primary.solid}
                    />
                    <Text
                      style={[
                        styles.actionText,
                        { color: palette.primary.solid },
                      ]}
                    >
                      Comment
                    </Text>
                  </TouchableOpacity>
                </View>

                {expandedComments[post.id] ? (
                  <>
                    <View style={styles.commentComposer}>
                      <TextInput
                        value={commentDrafts[post.id] || ""}
                        onChangeText={(text) =>
                          setCommentDrafts((prev) => ({
                            ...prev,
                            [post.id]: text,
                          }))
                        }
                        placeholder="Write a comment"
                        placeholderTextColor={palette.text.tertiary}
                        style={[
                          styles.commentInput,
                          {
                            color: palette.text.primary,
                            borderColor: palette.surface.border,
                          },
                        ]}
                      />
                      <TouchableOpacity
                        style={[
                          styles.commentSend,
                          { backgroundColor: palette.primary.solid },
                        ]}
                        onPress={() => sendComment(post.id)}
                      >
                        <Ionicons
                          name="arrow-up"
                          size={16}
                          color={palette.primary.on}
                        />
                      </TouchableOpacity>
                    </View>

                    {(post.comments || []).map((comment) => {
                      const isCommentOwner =
                        String(comment.user_id || comment.user?.id) ===
                        String(myUserId);
                      const canDelete = isCommentOwner || isPostOwner;
                      const isEditing =
                        String(editingComment?.commentId) ===
                        String(comment.id);
                      const replyKey = `${post.id}:${comment.id}`;
                      const showReplyComposer = activeReplyTarget === replyKey;

                      return (
                        <View
                          key={String(comment.id)}
                          style={[
                            styles.commentItem,
                            {
                              backgroundColor: palette.surface.soft,
                            },
                          ]}
                        >
                          <View style={styles.commentHead}>
                            <Text
                              style={[
                                styles.commentAuthor,
                                { color: palette.text.primary },
                              ]}
                            >
                              {comment.user?.full_name || "User"}
                            </Text>
                            <Text
                              style={[
                                styles.commentTime,
                                { color: palette.text.secondary },
                              ]}
                            >
                              {new Date(comment.created_at).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Text>
                          </View>

                          {isEditing ? (
                            <View style={styles.editRow}>
                              <TextInput
                                value={editingComment.text}
                                onChangeText={(text) =>
                                  setEditingComment((prev) => ({
                                    ...prev,
                                    text,
                                  }))
                                }
                                style={[
                                  styles.editInput,
                                  {
                                    color: palette.text.primary,
                                    borderColor: palette.surface.border,
                                  },
                                ]}
                              />
                              <TouchableOpacity onPress={saveEditedComment}>
                                <Ionicons
                                  name="checkmark"
                                  size={17}
                                  color={palette.primary.solid}
                                />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => setEditingComment(null)}
                              >
                                <Ionicons
                                  name="close"
                                  size={17}
                                  color={palette.text.secondary}
                                />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <Text
                              style={[
                                styles.commentText,
                                { color: palette.text.primary },
                              ]}
                            >
                              {comment.content}
                            </Text>
                          )}

                          {!isEditing ? (
                            <View style={styles.commentActions}>
                              <TouchableOpacity
                                style={styles.commentActionBtn}
                                onPress={() =>
                                  toggleCommentLike(post.id, comment.id)
                                }
                              >
                                <Ionicons
                                  name={
                                    comment.is_liked ? "heart" : "heart-outline"
                                  }
                                  size={14}
                                  color={
                                    comment.is_liked
                                      ? "#E74C3C"
                                      : palette.primary.solid
                                  }
                                />
                                <Text
                                  style={[
                                    styles.commentActionText,
                                    {
                                      color: comment.is_liked
                                        ? "#E74C3C"
                                        : palette.primary.solid,
                                    },
                                  ]}
                                >
                                  Like
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.commentActionBtn}
                                onPress={() =>
                                  setActiveReplyTarget((prev) =>
                                    prev === replyKey ? null : replyKey,
                                  )
                                }
                              >
                                <Ionicons
                                  name="return-up-forward-outline"
                                  size={14}
                                  color={palette.primary.solid}
                                />
                                <Text
                                  style={[
                                    styles.commentActionText,
                                    { color: palette.primary.solid },
                                  ]}
                                >
                                  Comment
                                </Text>
                              </TouchableOpacity>
                              {isCommentOwner ? (
                                <TouchableOpacity
                                  style={styles.commentActionBtn}
                                  onPress={() =>
                                    setEditingComment({
                                      postId: post.id,
                                      commentId: comment.id,
                                      text: comment.content,
                                    })
                                  }
                                >
                                  <Ionicons
                                    name="create-outline"
                                    size={15}
                                    color={palette.primary.solid}
                                  />
                                </TouchableOpacity>
                              ) : null}
                              {canDelete ? (
                                <TouchableOpacity
                                  style={styles.commentActionBtn}
                                  onPress={() =>
                                    deleteComment(post.id, comment.id)
                                  }
                                >
                                  <Ionicons
                                    name="trash-outline"
                                    size={15}
                                    color={palette.status.danger}
                                  />
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          ) : null}

                          {!isEditing ? (
                            <Text
                              style={[
                                styles.commentLikeCount,
                                { color: palette.text.tertiary },
                              ]}
                            >
                              {comment.likes_count || 0} likes
                            </Text>
                          ) : null}

                          {showReplyComposer ? (
                            <View style={styles.replyComposer}>
                              <TextInput
                                value={replyDrafts[replyKey] || ""}
                                onChangeText={(text) =>
                                  setReplyDrafts((prev) => ({
                                    ...prev,
                                    [replyKey]: text,
                                  }))
                                }
                                placeholder="Write a reply"
                                placeholderTextColor={palette.text.tertiary}
                                style={[
                                  styles.replyInput,
                                  {
                                    color: palette.text.primary,
                                    borderColor: palette.surface.border,
                                  },
                                ]}
                              />
                              <TouchableOpacity
                                style={[
                                  styles.replySend,
                                  { backgroundColor: palette.primary.solid },
                                ]}
                                onPress={() => sendReply(post.id, comment.id)}
                              >
                                <Ionicons
                                  name="arrow-up"
                                  size={14}
                                  color={palette.primary.on}
                                />
                              </TouchableOpacity>
                            </View>
                          ) : null}

                          {(comment.replies || []).map((reply) => {
                            const replyKey = `${post.id}:${reply.id}`;
                            const replyOwner =
                              String(reply.user_id || reply.user?.id) ===
                              String(myUserId);
                            const canDeleteReply = replyOwner || isPostOwner;
                            const showReplyComposerForReply =
                              activeReplyTarget === replyKey;
                            return (
                              <View
                                key={String(reply.id)}
                                style={[
                                  styles.replyItem,
                                  {
                                    backgroundColor: palette.surface.light,
                                  },
                                ]}
                              >
                                <View style={styles.commentHead}>
                                  <Text
                                    style={[
                                      styles.commentAuthor,
                                      { color: palette.text.primary },
                                    ]}
                                  >
                                    {reply.user?.full_name || "User"}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.commentTime,
                                      { color: palette.text.secondary },
                                    ]}
                                  >
                                    {new Date(
                                      reply.created_at,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </Text>
                                </View>
                                <Text
                                  style={[
                                    styles.replyContextText,
                                    { color: palette.text.tertiary },
                                  ]}
                                >
                                  Replying to{" "}
                                  {comment.user?.full_name || "User"}
                                </Text>
                                <Text
                                  style={[
                                    styles.commentText,
                                    { color: palette.text.primary },
                                  ]}
                                >
                                  {reply.content}
                                </Text>
                                <View style={styles.commentActions}>
                                  <TouchableOpacity
                                    style={styles.commentActionBtn}
                                    onPress={() =>
                                      toggleCommentLike(post.id, reply.id)
                                    }
                                  >
                                    <Ionicons
                                      name={
                                        reply.is_liked
                                          ? "heart"
                                          : "heart-outline"
                                      }
                                      size={14}
                                      color={
                                        reply.is_liked
                                          ? "#E74C3C"
                                          : palette.primary.solid
                                      }
                                    />
                                    <Text
                                      style={[
                                        styles.commentActionText,
                                        {
                                          color: reply.is_liked
                                            ? "#E74C3C"
                                            : palette.primary.solid,
                                        },
                                      ]}
                                    >
                                      Like
                                    </Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={styles.commentActionBtn}
                                    onPress={() =>
                                      setActiveReplyTarget((prev) =>
                                        prev === replyKey ? null : replyKey,
                                      )
                                    }
                                  >
                                    <Ionicons
                                      name="return-up-forward-outline"
                                      size={15}
                                      color={palette.primary.solid}
                                    />
                                    <Text
                                      style={[
                                        styles.commentActionText,
                                        { color: palette.primary.solid },
                                      ]}
                                    >
                                      Comment
                                    </Text>
                                  </TouchableOpacity>
                                  {canDeleteReply ? (
                                    <TouchableOpacity
                                      style={styles.commentActionBtn}
                                      onPress={() =>
                                        deleteComment(post.id, reply.id)
                                      }
                                    >
                                      <Ionicons
                                        name="trash-outline"
                                        size={15}
                                        color={palette.status.danger}
                                      />
                                    </TouchableOpacity>
                                  ) : null}
                                </View>
                                <Text
                                  style={[
                                    styles.commentLikeCount,
                                    { color: palette.text.tertiary },
                                  ]}
                                >
                                  {reply.likes_count || 0} likes
                                </Text>

                                {showReplyComposerForReply ? (
                                  <View style={styles.replyComposer}>
                                    <TextInput
                                      value={replyDrafts[replyKey] || ""}
                                      onChangeText={(text) =>
                                        setReplyDrafts((prev) => ({
                                          ...prev,
                                          [replyKey]: text,
                                        }))
                                      }
                                      placeholder="Write a reply"
                                      placeholderTextColor={
                                        palette.text.tertiary
                                      }
                                      style={[
                                        styles.replyInput,
                                        {
                                          color: palette.text.primary,
                                          borderColor: palette.surface.border,
                                        },
                                      ]}
                                    />
                                    <TouchableOpacity
                                      style={[
                                        styles.replySend,
                                        {
                                          backgroundColor:
                                            palette.primary.solid,
                                        },
                                      ]}
                                      onPress={() =>
                                        sendReply(post.id, reply.id)
                                      }
                                    >
                                      <Ionicons
                                        name="arrow-up"
                                        size={14}
                                        color={palette.primary.on}
                                      />
                                    </TouchableOpacity>
                                  </View>
                                ) : null}
                              </View>
                            );
                          })}
                        </View>
                      );
                    })}
                  </>
                ) : null}
              </ElevatedCard>
            );
          })}
        </ScrollView>
      </KeyboardAvoidingView>

      {showUploadBubble ? (
        <View
          style={[
            styles.uploadBubble,
            { top: Math.max(spacing.lg, insets.top + spacing.xs) },
            {
              borderColor: palette.surface.border,
              backgroundColor: palette.surface.light,
            },
          ]}
        >
          <View style={styles.uploadBubbleHeader}>
            <Text style={[styles.uploadBubbleTitle, { color: palette.text.primary }]}>
              {uploadBubbleTitle}
            </Text>
            {upload.status === "success" || upload.status === "error" ? (
              <TouchableOpacity onPress={clearUpload}>
                <Ionicons name="close" size={16} color={palette.text.secondary} />
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={[styles.uploadBubbleText, { color: palette.text.secondary }]}>
            {upload.error || upload.message || "Preparing upload..."}
          </Text>
          <View
            style={[
              styles.uploadProgressTrack,
              { backgroundColor: palette.surface.soft },
            ]}
          >
            <View
              style={[
                styles.uploadProgressFill,
                {
                  width: `${Math.max(
                    4,
                    Math.min(
                      100,
                      upload.status === "success"
                        ? 100
                        : upload.status === "error"
                          ? upload.progress || 8
                          : upload.progress || 4,
                    ),
                  )}%`,
                  backgroundColor:
                    upload.status === "error"
                      ? palette.status.danger
                      : palette.primary.solid,
                },
              ]}
            />
          </View>
          <Text style={[styles.uploadBubblePercent, { color: palette.text.tertiary }]}>
            {upload.status === "success"
              ? "100%"
              : `${Math.max(0, Math.min(99, upload.progress || 0))}%`}
          </Text>
        </View>
      ) : null}

      <Modal
        visible={Boolean(viewer)}
        transparent
        animationType="fade"
        onRequestClose={closeMediaViewer}
      >
        <View style={styles.viewerBackdrop}>
          <TouchableOpacity
            style={styles.viewerClose}
            onPress={closeMediaViewer}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {viewer?.type === "video" ? (
            <View style={styles.videoViewerWrap}>
              <Video
                ref={viewerVideoRef}
                source={{ uri: viewer.url }}
                style={styles.viewerMedia}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                useNativeControls
                onPlaybackStatusUpdate={(status) => {
                  if (!status.isLoaded) return;
                  setIsViewerVideoPlaying(status.isPlaying);
                  setIsViewerVideoEnded(Boolean(status.didJustFinish));
                }}
              />
              <Text style={styles.videoStateText}>
                {isViewerVideoEnded
                  ? "Video finished"
                  : isViewerVideoPlaying
                    ? "Playing"
                    : "Paused"}
              </Text>
            </View>
          ) : (
            <Image
              source={{ uri: viewer?.url }}
              style={styles.viewerMedia}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      <Modal
        visible={likesModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setLikesModal({
            visible: false,
            users: [],
            loading: false,
            title: "Liked by",
          })
        }
      >
        <View style={styles.likesBackdrop}>
          <View
            style={[
              styles.likesSheet,
              {
                backgroundColor: palette.surface.light,
                borderColor: palette.surface.border,
              },
            ]}
          >
            <View style={styles.likesHeader}>
              <Text
                style={[styles.likesTitle, { color: palette.text.primary }]}
              >
                {likesModal.title || "Liked by"}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setLikesModal({
                    visible: false,
                    users: [],
                    loading: false,
                    title: "Liked by",
                  })
                }
              >
                <Ionicons
                  name="close"
                  size={18}
                  color={palette.text.secondary}
                />
              </TouchableOpacity>
            </View>
            {likesModal.loading ? (
              <Text
                style={[styles.likesEmpty, { color: palette.text.secondary }]}
              >
                Loading...
              </Text>
            ) : likesModal.users.length === 0 ? (
              <Text
                style={[styles.likesEmpty, { color: palette.text.secondary }]}
              >
                No likes yet.
              </Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {likesModal.users.map((likeUser) => (
                  <TouchableOpacity
                    key={`like-user-${likeUser.id}`}
                    style={styles.likeUserRow}
                    onPress={() => {
                      setLikesModal({
                        visible: false,
                        users: [],
                        loading: false,
                        title: "Liked by",
                      });
                      openAuthorProfile(likeUser.id);
                    }}
                  >
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: `${palette.primary.solid}22` },
                      ]}
                    >
                      {likeUser.profile_image_url ? (
                        <Image
                          source={{ uri: likeUser.profile_image_url }}
                          style={styles.avatar}
                        />
                      ) : (
                        <Text
                          style={[
                            styles.avatarInitials,
                            { color: palette.primary.solid },
                          ]}
                        >
                          {likeUser.full_name?.slice(0, 1)?.toUpperCase() ||
                            "U"}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.likeUserName,
                        { color: palette.text.primary },
                      ]}
                    >
                      {likeUser.full_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 0,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  centeredContent: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  uploadBubble: {
    position: "absolute",
    top: spacing.lg,
    left: spacing.screenPadding,
    right: spacing.screenPadding,
    borderWidth: 0,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    zIndex: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  uploadBubbleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  uploadBubbleTitle: {
    ...typography.caption,
    fontWeight: "700",
  },
  uploadBubbleText: {
    ...typography.caption,
    marginTop: 2,
  },
  uploadProgressTrack: {
    width: "100%",
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: spacing.xs,
  },
  uploadProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  uploadBubblePercent: {
    ...typography.caption,
    marginTop: 2,
    textAlign: "right",
    fontWeight: "700",
  },
  feedHeader: {
    borderWidth: 0,
    borderRadius: 0,
    marginHorizontal: -spacing.screenPadding,
    padding: spacing.md,
    minHeight: 180,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    ...typography.headline,
  },
  subtitle: {
    ...typography.body,
    marginTop: 4,
    lineHeight: 20,
    fontWeight: "500",
  },
  feedHeaderTextWrap: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  feedMeta: {
    ...typography.caption,
    marginTop: 4,
    fontWeight: "600",
  },
  createPostBtn: {
    minHeight: 42,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  createPostText: {
    ...typography.caption,
    fontWeight: "700",
  },
  composerCard: {
    padding: spacing.md,
  },
  closedComposerWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  composerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  composerAvatarText: {
    ...typography.bodyBold,
  },
  closedComposerInput: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: radius.pill,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  closedComposerText: {
    ...typography.body,
  },
  postInput: {
    minHeight: 90,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    textAlignVertical: "top",
  },
  mediaInput: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  composerActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  pickMediaBtn: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: 42,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  pickMediaText: {
    ...typography.caption,
    fontWeight: "700",
  },
  previewWrap: {
    marginTop: spacing.xs,
  },
  mediaPreview: {
    width: "100%",
    height: 180,
    borderRadius: radius.md,
  },
  caption: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  smallBtn: {
    flex: 1,
  },
  loading: {
    ...typography.caption,
    textAlign: "center",
  },
  loadingCard: {
    borderWidth: 0,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyCard: {
    borderWidth: 0,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyTitle: {
    ...typography.titleLarge,
    marginTop: 2,
  },
  emptyText: {
    ...typography.body,
    textAlign: "center",
    maxWidth: 360,
  },
  postCard: {
    padding: spacing.md,
    borderWidth: 0,
    borderRadius: radius.xl,
    marginBottom: spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  avatarInitials: {
    ...typography.caption,
    fontWeight: "700",
  },
  authorName: {
    ...typography.bodyBold,
  },
  timestamp: {
    ...typography.caption,
    marginTop: 1,
  },
  postContent: {
    ...typography.body,
    marginTop: spacing.sm,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  postMedia: {
    width: "100%",
    height: 200,
    borderRadius: radius.xl,
    marginTop: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  videoPreviewWrap: {
    height: 200,
    borderRadius: radius.xl,
    marginTop: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  videoTapText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  videoThumbWrap: {
    marginTop: spacing.sm,
    borderRadius: radius.xl,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  videoThumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  metaText: {
    ...typography.caption,
    fontWeight: "600",
  },
  actionRow: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
  },
  actionBtn: {
    minHeight: 42,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    borderWidth: 0,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  actionText: {
    ...typography.caption,
    fontWeight: "700",
  },
  commentComposer: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: 0,
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    fontSize: typography.body.fontSize,
  },
  commentSend: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  commentItem: {
    marginTop: spacing.xs,
    borderWidth: 0,
    borderRadius: radius.lg,
    padding: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  commentHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
    marginBottom: 2,
    paddingBottom: 0,
  },
  commentAuthor: {
    ...typography.caption,
    fontWeight: "700",
    flex: 1,
  },
  commentTime: {
    ...typography.caption,
  },
  commentText: {
    ...typography.body,
    marginTop: 4,
    lineHeight: 20,
    marginBottom: 2,
  },
  commentActions: {
    marginTop: spacing.xs,
    marginBottom: 2,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "flex-start",
    alignItems: "center",
    flexWrap: "wrap",
    paddingHorizontal: 0,
  },
  commentActionBtn: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.xs,
  },
  commentActionText: {
    ...typography.caption,
    fontWeight: "700",
    fontSize: 12,
  },
  commentLikeCount: {
    ...typography.caption,
    marginTop: 2,
  },
  replyComposer: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingLeft: spacing.sm,
    paddingRight: 0,
  },
  replyInput: {
    flex: 1,
    minHeight: 38,
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    fontSize: typography.body.fontSize,
  },
  replySend: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  replyItem: {
    marginTop: spacing.xs,
    marginLeft: spacing.md,
    borderWidth: 0,
    borderRadius: radius.lg,
    padding: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  replyContextText: {
    ...typography.caption,
    marginTop: 2,
    fontWeight: "600",
  },
  editRow: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  editInput: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    fontSize: typography.body.fontSize,
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  viewerClose: {
    position: "absolute",
    top: 54,
    right: 16,
    zIndex: 5,
  },
  viewerMedia: {
    width: "100%",
    height: "70%",
    borderRadius: radius.md,
  },
  videoViewerWrap: {
    width: "100%",
    alignItems: "center",
  },
  videoStateText: {
    ...typography.caption,
    color: "#FFFFFFCC",
    marginTop: spacing.xs,
  },
  likesBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: spacing.screenPadding,
  },
  likesSheet: {
    maxHeight: "60%",
    borderRadius: radius.xl,
    borderWidth: 0,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  likesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  likesTitle: {
    ...typography.bodyBold,
  },
  likesEmpty: {
    ...typography.body,
    textAlign: "center",
    marginVertical: spacing.md,
  },
  likeUserRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
  },
  likeUserName: {
    ...typography.bodyMedium,
  },
});
