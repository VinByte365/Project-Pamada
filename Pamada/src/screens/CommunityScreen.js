import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import Button from '../components/common/Button';
import ElevatedCard from '../components/ui/ElevatedCard';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../contexts/RealtimeContext';
import { apiRequest } from '../utils/api';
import { radius, spacing, typography } from '../theme';
import useAppTheme from '../theme/useAppTheme';

export default function CommunityScreen() {
  const navigation = useNavigation();
  const { palette } = useAppTheme();
  const { user, token } = useAuth();
  const { socket } = useRealtime();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [postDraft, setPostDraft] = useState('');
  const [mediaUrlDraft, setMediaUrlDraft] = useState('');
  const [pickedMedia, setPickedMedia] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [authorMenuPostId, setAuthorMenuPostId] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [editingComment, setEditingComment] = useState(null);

  const myUserId = user?.id || user?._id;

  const loadPosts = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('/api/v1/community/posts', {
        method: 'GET',
        token,
      });
      setPosts(response?.data?.posts || []);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to load community posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onCreated = (post) => {
      setPosts((prev) => [post, ...prev.filter((item) => String(item.id) !== String(post.id))]);
    };
    const onDeleted = ({ postId }) => {
      setPosts((prev) => prev.filter((item) => String(item.id) !== String(postId)));
    };
    const onUpdated = ({ postId, likes_count, comments_count }) => {
      setPosts((prev) =>
        prev.map((item) =>
          String(item.id) === String(postId)
            ? { ...item, likes_count, comments_count }
            : item
        )
      );
    };
    const onComment = (comment) => {
      setPosts((prev) =>
        prev.map((item) => {
          if (String(item.id) !== String(comment.post_id)) return item;
          const exists = (item.comments || []).some((entry) => String(entry.id) === String(comment.id));
          const nextComments = exists ? (item.comments || []) : [...(item.comments || []), comment];
          return {
            ...item,
            comments: nextComments,
            comments_count: nextComments.length,
          };
        })
      );
    };
    const onCommentUpdated = (comment) => {
      setPosts((prev) =>
        prev.map((item) => {
          if (String(item.id) !== String(comment.post_id)) return item;
          return {
            ...item,
            comments: (item.comments || []).map((entry) =>
              String(entry.id) === String(comment.id) ? { ...entry, ...comment } : entry
            ),
          };
        })
      );
    };
    const onCommentDeleted = ({ post_id, comment_id }) => {
      setPosts((prev) =>
        prev.map((item) => {
          if (String(item.id) !== String(post_id)) return item;
          const nextComments = (item.comments || []).filter((entry) => String(entry.id) !== String(comment_id));
          return {
            ...item,
            comments: nextComments,
            comments_count: nextComments.length,
          };
        })
      );
    };

    socket.on('community:post_created', onCreated);
    socket.on('community:post_deleted', onDeleted);
    socket.on('community:post_updated', onUpdated);
    socket.on('community:comment_created', onComment);
    socket.on('community:comment_updated', onCommentUpdated);
    socket.on('community:comment_deleted', onCommentDeleted);

    return () => {
      socket.off('community:post_created', onCreated);
      socket.off('community:post_deleted', onDeleted);
      socket.off('community:post_updated', onUpdated);
      socket.off('community:comment_created', onComment);
      socket.off('community:comment_updated', onCommentUpdated);
      socket.off('community:comment_deleted', onCommentDeleted);
    };
  }, [socket]);

  const submitPost = async () => {
    const content = postDraft.trim();
    if (!content && !pickedMedia && !mediaUrlDraft.trim()) return;

    try {
      if (pickedMedia) {
        const formData = new FormData();
        formData.append('content', content);
        formData.append('media', {
          uri: pickedMedia.uri,
          name: pickedMedia.fileName || `community-${Date.now()}.${pickedMedia.mimeType?.includes('video') ? 'mp4' : 'jpg'}`,
          type: pickedMedia.mimeType || 'image/jpeg',
        });
        await apiRequest('/api/v1/community/posts', {
          method: 'POST',
          token,
          body: formData,
        });
      } else {
        await apiRequest('/api/v1/community/posts', {
          method: 'POST',
          token,
          body: JSON.stringify({
            content,
            media_url: mediaUrlDraft.trim(),
          }),
        });
      }

      setPostDraft('');
      setMediaUrlDraft('');
      setPickedMedia(null);
      setComposerOpen(false);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create post');
    }
  };

  const toggleLike = async (postId) => {
    setPosts((prev) =>
      prev.map((item) => {
        if (String(item.id) !== String(postId)) return item;
        const nextLiked = !item.is_liked;
        return {
          ...item,
          is_liked: nextLiked,
          likes_count: Math.max(0, (item.likes_count || 0) + (nextLiked ? 1 : -1)),
        };
      })
    );

    try {
      await apiRequest(`/api/v1/community/posts/${postId}/like`, {
        method: 'POST',
        token,
      });
    } catch (error) {
      loadPosts();
    }
  };

  const sendComment = async (postId) => {
    const content = (commentDrafts[postId] || '').trim();
    if (!content) return;

    try {
      await apiRequest(`/api/v1/community/posts/${postId}/comments`, {
        method: 'POST',
        token,
        body: JSON.stringify({ content }),
      });
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to add comment');
    }
  };

  const saveEditedComment = async () => {
    if (!editingComment?.postId || !editingComment?.commentId) return;
    const content = String(editingComment.text || '').trim();
    if (!content) return;

    try {
      await apiRequest(
        `/api/v1/community/posts/${editingComment.postId}/comments/${editingComment.commentId}`,
        {
          method: 'PUT',
          token,
          body: JSON.stringify({ content }),
        }
      );
      setEditingComment(null);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update comment');
    }
  };

  const deleteComment = async (postId, commentId) => {
    try {
      await apiRequest(`/api/v1/community/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
        token,
      });
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to delete comment');
    }
  };

  const deletePost = async (postId) => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/api/v1/community/posts/${postId}`, {
              method: 'DELETE',
              token,
            });
          } catch (error) {
            Alert.alert('Error', error.message || 'Failed to delete post');
          }
        },
      },
    ]);
  };

  const toggleComments = (postId) => {
    setExpandedComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const openAuthorMenu = (postId) => {
    setAuthorMenuPostId((prev) => (String(prev) === String(postId) ? null : postId));
  };

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (asset) {
      setPickedMedia(asset);
      setMediaUrlDraft('');
    }
  };

  const orderedPosts = useMemo(
    () => [...posts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [posts]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
        >
          <Text style={[styles.title, { color: palette.text.primary }]}>Community</Text>
          <Text style={[styles.subtitle, { color: palette.text.secondary }]}>Share Aloe Vera insights and connect with growers.</Text>

          <ElevatedCard style={styles.composerCard}>
            {composerOpen ? (
              <>
                <TextInput
                  value={postDraft}
                  onChangeText={setPostDraft}
                  multiline
                  style={[styles.postInput, { color: palette.text.primary, borderColor: palette.surface.border }]}
                  placeholder="Write something useful for the community..."
                  placeholderTextColor={palette.text.tertiary}
                />
                <TouchableOpacity
                  style={[styles.pickMediaBtn, { borderColor: palette.surface.border, backgroundColor: palette.surface.soft }]}
                  onPress={pickMedia}
                >
                  <Ionicons name="image-outline" size={16} color={palette.text.primary} />
                  <Text style={[styles.pickMediaText, { color: palette.text.primary }]}>
                    {pickedMedia ? 'Change media' : 'Upload image or video'}
                  </Text>
                </TouchableOpacity>
                {pickedMedia ? (
                  <View style={styles.previewWrap}>
                    {pickedMedia?.mimeType?.includes('video') ? (
                      <View style={[styles.videoPreviewWrap, { backgroundColor: palette.surface.soft }]}>
                        <Ionicons name="videocam-outline" size={36} color={palette.primary.solid} />
                        <Text style={[styles.videoTapText, { color: palette.text.secondary }]}>Video selected</Text>
                      </View>
                    ) : (
                      <Image source={{ uri: pickedMedia.uri }} style={styles.mediaPreview} />
                    )}
                  </View>
                ) : null}
                <TextInput
                  value={mediaUrlDraft}
                  onChangeText={setMediaUrlDraft}
                  style={[styles.mediaInput, { color: palette.text.primary, borderColor: palette.surface.border }]}
                  placeholder="Optional media URL"
                  placeholderTextColor={palette.text.tertiary}
                  autoCapitalize="none"
                />
                <Text style={[styles.caption, { color: palette.text.tertiary }]}>
                  You can upload media or use an external media URL.
                </Text>
                <View style={styles.composerActions}>
                  <Button label="Cancel" type="secondary" onPress={() => setComposerOpen(false)} style={styles.smallBtn} />
                  <Button label="Post" onPress={submitPost} style={styles.smallBtn} />
                </View>
              </>
            ) : (
              <Button label="Create Post" onPress={() => setComposerOpen(true)} />
            )}
          </ElevatedCard>

          {loading ? <Text style={[styles.loading, { color: palette.text.secondary }]}>Loading posts...</Text> : null}

          {orderedPosts.map((post) => {
            const isPostOwner = String(post.user?.id) === String(myUserId);
            return (
              <ElevatedCard key={String(post.id)} style={styles.postCard}>
                <View style={styles.postHeader}>
                  <TouchableOpacity style={styles.authorRow} onPress={() => openAuthorMenu(post.id)}>
                    {post.user.profile_image_url ? (
                      <Image source={{ uri: post.user.profile_image_url }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, { backgroundColor: `${palette.primary.solid}22` }]}>
                        <Text style={[styles.avatarInitials, { color: palette.primary.solid }]}>
                          {post.user.full_name?.slice(0, 1).toUpperCase() || 'U'}
                        </Text>
                      </View>
                    )}
                    <View>
                      <Text style={[styles.authorName, { color: palette.text.primary }]}>{post.user.full_name}</Text>
                      <Text style={[styles.timestamp, { color: palette.text.secondary }]}>
                        {new Date(post.created_at).toLocaleString()}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {isPostOwner ? (
                    <TouchableOpacity onPress={() => deletePost(post.id)}>
                      <Ionicons name="trash-outline" size={18} color={palette.status.danger} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {String(authorMenuPostId) === String(post.id) ? (
                  <View style={[styles.authorMenu, { borderColor: palette.surface.border, backgroundColor: palette.surface.light }]}>
                    {!isPostOwner ? (
                      <TouchableOpacity
                        style={styles.authorMenuItem}
                        onPress={() => {
                          setAuthorMenuPostId(null);
                          navigation.navigate('Messages', {
                            userId: post.user.id,
                            userName: post.user.full_name,
                          });
                        }}
                      >
                        <Ionicons name="send-outline" size={15} color={palette.text.primary} />
                        <Text style={[styles.authorMenuText, { color: palette.text.primary }]}>Message</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={styles.authorMenuItem}
                      onPress={() => {
                        setAuthorMenuPostId(null);
                        if (isPostOwner) {
                          navigation.navigate('Profile');
                        } else {
                          navigation.navigate('PublicProfile', { userId: post.user.id });
                        }
                      }}
                    >
                      <Ionicons name="person-outline" size={15} color={palette.text.primary} />
                      <Text style={[styles.authorMenuText, { color: palette.text.primary }]}>View Profile</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                <Text style={[styles.postContent, { color: palette.text.primary }]}>{post.content}</Text>

                {post.media_url ? (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() =>
                      setViewer({
                        type: post.media_type || 'image',
                        url: post.media_url,
                      })
                    }
                  >
                    {post.media_type === 'video' ? (
                      <View style={[styles.videoPreviewWrap, { backgroundColor: palette.surface.soft }]}>
                        <Ionicons name="play-circle-outline" size={44} color={palette.primary.solid} />
                        <Text style={[styles.videoTapText, { color: palette.text.secondary }]}>Tap to play video</Text>
                      </View>
                    ) : (
                      <Image source={{ uri: post.media_url }} style={styles.postMedia} />
                    )}
                  </TouchableOpacity>
                ) : null}

                <View style={styles.metaRow}>
                  <Text style={[styles.metaText, { color: palette.text.secondary }]}>{post.likes_count || 0} likes</Text>
                  <Text style={[styles.metaText, { color: palette.text.secondary }]}>{post.comments_count || 0} comments</Text>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLike(post.id)}>
                    <Ionicons name={post.is_liked ? 'heart' : 'heart-outline'} size={17} color={post.is_liked ? '#E74C3C' : palette.primary.solid} />
                    <Text style={[styles.actionText, { color: palette.primary.solid }]}>Like</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => toggleComments(post.id)}>
                    <Ionicons name="chatbubble-outline" size={17} color={palette.primary.solid} />
                    <Text style={[styles.actionText, { color: palette.primary.solid }]}>Comment</Text>
                  </TouchableOpacity>
                </View>

                {expandedComments[post.id] ? (
                  <>
                    <View style={styles.commentComposer}>
                      <TextInput
                        value={commentDrafts[post.id] || ''}
                        onChangeText={(text) => setCommentDrafts((prev) => ({ ...prev, [post.id]: text }))}
                        placeholder="Write a comment"
                        placeholderTextColor={palette.text.tertiary}
                        style={[styles.commentInput, { color: palette.text.primary, borderColor: palette.surface.border }]}
                      />
                      <TouchableOpacity style={[styles.commentSend, { backgroundColor: palette.primary.solid }]} onPress={() => sendComment(post.id)}>
                        <Ionicons name="arrow-up" size={16} color={palette.primary.on} />
                      </TouchableOpacity>
                    </View>

                    {(post.comments || []).map((comment) => {
                      const isCommentOwner = String(comment.user_id || comment.user?.id) === String(myUserId);
                      const canDelete = isCommentOwner || isPostOwner;
                      const isEditing = String(editingComment?.commentId) === String(comment.id);

                      return (
                        <View key={String(comment.id)} style={[styles.commentItem, { borderColor: palette.surface.border }]}>
                          <View style={styles.commentHead}>
                            <Text style={[styles.commentAuthor, { color: palette.text.primary }]}>{comment.user?.full_name || 'User'}</Text>
                            <Text style={[styles.commentTime, { color: palette.text.secondary }]}>
                              {new Date(comment.created_at).toLocaleString()}
                            </Text>
                          </View>

                          {isEditing ? (
                            <View style={styles.editRow}>
                              <TextInput
                                value={editingComment.text}
                                onChangeText={(text) => setEditingComment((prev) => ({ ...prev, text }))}
                                style={[styles.editInput, { color: palette.text.primary, borderColor: palette.surface.border }]}
                              />
                              <TouchableOpacity onPress={saveEditedComment}>
                                <Ionicons name="checkmark" size={17} color={palette.primary.solid} />
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => setEditingComment(null)}>
                                <Ionicons name="close" size={17} color={palette.text.secondary} />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <Text style={[styles.commentText, { color: palette.text.secondary }]}>{comment.content}</Text>
                          )}

                          {!isEditing && (isCommentOwner || canDelete) ? (
                            <View style={styles.commentActions}>
                              {isCommentOwner ? (
                                <TouchableOpacity
                                  onPress={() =>
                                    setEditingComment({
                                      postId: post.id,
                                      commentId: comment.id,
                                      text: comment.content,
                                    })
                                  }
                                >
                                  <Ionicons name="create-outline" size={15} color={palette.primary.solid} />
                                </TouchableOpacity>
                              ) : null}
                              {canDelete ? (
                                <TouchableOpacity onPress={() => deleteComment(post.id, comment.id)}>
                                  <Ionicons name="trash-outline" size={15} color={palette.status.danger} />
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          ) : null}
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

      <Modal
        visible={Boolean(viewer)}
        transparent
        animationType="fade"
        onRequestClose={() => setViewer(null)}
      >
        <View style={styles.viewerBackdrop}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setViewer(null)}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {viewer?.type === 'video' ? (
            <TouchableOpacity
              style={[styles.openVideoBtn, { backgroundColor: palette.primary.solid }]}
              onPress={() => Linking.openURL(viewer.url).catch(() => {})}
            >
              <Ionicons name="play-circle-outline" size={18} color={palette.primary.on} />
              <Text style={[styles.openVideoText, { color: palette.primary.on }]}>Open Video</Text>
            </TouchableOpacity>
          ) : (
            <Image source={{ uri: viewer?.url }} style={styles.viewerMedia} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  title: {
    ...typography.headline,
  },
  subtitle: {
    ...typography.body,
    marginTop: 4,
  },
  composerCard: {
    padding: spacing.md,
  },
  postInput: {
    minHeight: 90,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    textAlignVertical: 'top',
  },
  mediaInput: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  composerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  pickMediaBtn: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: 42,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pickMediaText: {
    ...typography.caption,
    fontWeight: '700',
  },
  previewWrap: {
    marginTop: spacing.xs,
  },
  mediaPreview: {
    width: '100%',
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
  },
  postCard: {
    padding: spacing.md,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  authorMenu: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.xs,
    gap: spacing.xxs,
  },
  authorMenuItem: {
    minHeight: 36,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  authorMenuText: {
    ...typography.caption,
    fontWeight: '700',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    ...typography.caption,
    fontWeight: '700',
  },
  authorName: {
    ...typography.bodyBold,
  },
  timestamp: {
    ...typography.caption,
  },
  postContent: {
    ...typography.body,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  postMedia: {
    width: '100%',
    height: 200,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  videoPreviewWrap: {
    height: 200,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTapText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  metaText: {
    ...typography.caption,
  },
  actionRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    minHeight: 36,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: '#BFE4CC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionText: {
    ...typography.caption,
    fontWeight: '700',
  },
  commentComposer: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
  },
  commentSend: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentItem: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  commentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  commentAuthor: {
    ...typography.caption,
    fontWeight: '700',
    flex: 1,
  },
  commentTime: {
    ...typography.caption,
  },
  commentText: {
    ...typography.body,
    marginTop: 4,
  },
  commentActions: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  editRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  editInput: {
    flex: 1,
    minHeight: 38,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  viewerClose: {
    position: 'absolute',
    top: 54,
    right: 16,
    zIndex: 5,
  },
  viewerMedia: {
    width: '100%',
    height: '70%',
    borderRadius: radius.md,
  },
  openVideoBtn: {
    minHeight: 46,
    borderRadius: radius.button,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  openVideoText: {
    ...typography.bodyBold,
  },
});
