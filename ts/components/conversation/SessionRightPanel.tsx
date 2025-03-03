import { compact, flatten } from 'lodash';
import React, { useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import useInterval from 'react-use/lib/useInterval';
import styled from 'styled-components';
import { Data } from '../../data/data';
import { SessionIconButton } from '../icon';

import {
  deleteAllMessagesByConvoIdWithConfirmation,
  setDisappearingMessagesByConvoId,
  showAddModeratorsByConvoId,
  showInviteContactByConvoId,
  showLeaveGroupByConvoId,
  showRemoveModeratorsByConvoId,
  showUpdateGroupMembersByConvoId,
  showUpdateGroupNameByConvoId,
} from '../../interactions/conversationInteractions';
import { Constants } from '../../session';
import { closeRightPanel } from '../../state/ducks/conversations';
import { isRightPanelShowing } from '../../state/selectors/conversations';
import {
  useSelectedConversationKey,
  useSelectedDisplayNameInProfile,
  useSelectedIsActive,
  useSelectedIsBlocked,
  useSelectedIsGroup,
  useSelectedIsKickedFromGroup,
  useSelectedIsLeft,
  useSelectedIsPublic,
  useSelectedSubscriberCount,
  useSelectedWeAreAdmin,
} from '../../state/selectors/selectedConversation';
import { getTimerOptions } from '../../state/selectors/timerOptions';
import { AttachmentTypeWithPath } from '../../types/Attachment';
import { getAbsoluteAttachmentPath } from '../../types/MessageAttachment';
import { Avatar, AvatarSize } from '../avatar/Avatar';
import { SessionButton, SessionButtonColor, SessionButtonType } from '../basic/SessionButton';
import { SessionDropdown } from '../basic/SessionDropdown';
import { SpacerLG } from '../basic/Text';
import { MediaItemType } from '../lightbox/LightboxGallery';
import { MediaGallery } from './media-gallery/MediaGallery';

async function getMediaGalleryProps(
  conversationId: string
): Promise<{
  documents: Array<MediaItemType>;
  media: Array<MediaItemType>;
}> {
  // We fetch more documents than media as they don’t require to be loaded
  // into memory right away. Revisit this once we have infinite scrolling:
  const rawMedia = await Data.getMessagesWithVisualMediaAttachments(
    conversationId,
    Constants.CONVERSATION.DEFAULT_MEDIA_FETCH_COUNT
  );
  const rawDocuments = await Data.getMessagesWithFileAttachments(
    conversationId,
    Constants.CONVERSATION.DEFAULT_DOCUMENTS_FETCH_COUNT
  );

  const media = flatten(
    rawMedia.map(attributes => {
      const { attachments, source, id, timestamp, serverTimestamp, received_at } = attributes;

      return (attachments || [])
        .filter(
          (attachment: AttachmentTypeWithPath) =>
            attachment.thumbnail && !attachment.pending && !attachment.error
        )
        .map((attachment: AttachmentTypeWithPath, index: number) => {
          const { thumbnail } = attachment;

          const mediaItem: MediaItemType = {
            objectURL: getAbsoluteAttachmentPath(attachment.path),
            thumbnailObjectUrl: thumbnail ? getAbsoluteAttachmentPath(thumbnail.path) : undefined,
            contentType: attachment.contentType || '',
            index,
            messageTimestamp: timestamp || serverTimestamp || received_at || 0,
            messageSender: source,
            messageId: id,
            attachment,
          };

          return mediaItem;
        });
    })
  );

  // Unlike visual media, only one non-image attachment is supported
  const documents = rawDocuments.map(attributes => {
    // this is to not fail if the attachment is invalid (could be a Long Attachment type which is not supported)
    if (!attributes.attachments?.length) {
      // window?.log?.info(
      //   'Got a message with an empty list of attachment. Skipping...'
      // );
      return null;
    }
    const attachment = attributes.attachments[0];
    const { source, id, timestamp, serverTimestamp, received_at } = attributes;

    return {
      contentType: attachment.contentType,
      index: 0,
      attachment,
      messageTimestamp: timestamp || serverTimestamp || received_at || 0,
      messageSender: source,
      messageId: id,
    };
  });

  return {
    media,
    documents: compact(documents), // remove null
  };
}

const HeaderItem = () => {
  const selectedConvoKey = useSelectedConversationKey();
  const dispatch = useDispatch();
  const isBlocked = useSelectedIsBlocked();
  const isKickedFromGroup = useSelectedIsKickedFromGroup();
  const left = useSelectedIsLeft();
  const isGroup = useSelectedIsGroup();

  if (!selectedConvoKey) {
    return null;
  }

  const showInviteContacts = isGroup && !isKickedFromGroup && !isBlocked && !left;

  return (
    <div className="group-settings-header">
      <SessionIconButton
        iconType="chevron"
        iconSize="medium"
        iconRotation={270}
        onClick={() => {
          dispatch(closeRightPanel());
        }}
        style={{ position: 'absolute' }}
        dataTestId="back-button-conversation-options"
      />
      <Avatar size={AvatarSize.XL} pubkey={selectedConvoKey} />
      {showInviteContacts && (
        <SessionIconButton
          iconType="addUser"
          iconSize="medium"
          onClick={() => {
            if (selectedConvoKey) {
              showInviteContactByConvoId(selectedConvoKey);
            }
          }}
          dataTestId="add-user-button"
        />
      )}
    </div>
  );
};

const StyledLeaveButton = styled.div`
  width: 100%;
  .session-button {
    margin-top: auto;
    width: 100%;
    min-height: calc(var(--composition-container-height) + 1px); // include border in height
    flex-shrink: 0;
    align-items: center;
    border-top: 1px solid var(--border-color);
    border-radius: 0px;

    &:not(.disabled) {
      &:hover {
        background-color: var(--button-solid-background-hover-color);
      }
    }
  }
`;

const StyledGroupSettingsItem = styled.div`
  display: flex;
  align-items: center;
  min-height: 3rem;
  font-size: var(--font-size-md);
  color: var(--right-panel-item-text-color);
  background-color: var(--right-panel-item-background-color);
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);

  width: -webkit-fill-available;
  padding: 0 var(--margins-md);
  transition: var(--default-duration);
  cursor: pointer;

  &:hover {
    background-color: var(--right-panel-item-background-hover-color);
  }
`;

const StyledName = styled.h4`
  padding-inline: var(--margins-md);
  font-size: var(--font-size-md);
`;

export const SessionRightPanelWithDetails = () => {
  const [documents, setDocuments] = useState<Array<MediaItemType>>([]);
  const [media, setMedia] = useState<Array<MediaItemType>>([]);

  const selectedConvoKey = useSelectedConversationKey();
  const isShowing = useSelector(isRightPanelShowing);
  const subscriberCount = useSelectedSubscriberCount();

  const isActive = useSelectedIsActive();
  const displayNameInProfile = useSelectedDisplayNameInProfile();
  const isBlocked = useSelectedIsBlocked();
  const isKickedFromGroup = useSelectedIsKickedFromGroup();
  const left = useSelectedIsLeft();
  const isGroup = useSelectedIsGroup();
  const isPublic = useSelectedIsPublic();
  const weAreAdmin = useSelectedWeAreAdmin();

  useEffect(() => {
    let isRunning = true;

    if (isShowing && selectedConvoKey) {
      // eslint-disable-next-line more/no-then
      void getMediaGalleryProps(selectedConvoKey).then(results => {
        if (isRunning) {
          setDocuments(results.documents);
          setMedia(results.media);
        }
      });
    }

    return () => {
      isRunning = false;
    };
  }, [isShowing, selectedConvoKey]);

  useInterval(async () => {
    if (isShowing && selectedConvoKey) {
      const results = await getMediaGalleryProps(selectedConvoKey);
      if (results.documents.length !== documents.length || results.media.length !== media.length) {
        setDocuments(results.documents);
        setMedia(results.media);
      }
    }
  }, 10000);

  const showMemberCount = !!(subscriberCount && subscriberCount > 0);
  const commonNoShow = isKickedFromGroup || left || isBlocked || !isActive;
  const hasDisappearingMessages = !isPublic && !commonNoShow;
  const leaveGroupString = isPublic
    ? window.i18n('leaveGroup')
    : isKickedFromGroup
    ? window.i18n('youGotKickedFromGroup')
    : left
    ? window.i18n('youLeftTheGroup')
    : window.i18n('leaveGroup');

  const timerOptions = useSelector(getTimerOptions).timerOptions;

  if (!selectedConvoKey) {
    return null;
  }
  const disappearingMessagesOptions = timerOptions.map(option => {
    return {
      content: option.name,
      onClick: () => {
        void setDisappearingMessagesByConvoId(selectedConvoKey, option.value);
      },
    };
  });

  const showUpdateGroupNameButton =
    isGroup && (!isPublic || (isPublic && weAreAdmin)) && !commonNoShow;
  const showAddRemoveModeratorsButton = weAreAdmin && !commonNoShow && isPublic;
  const showUpdateGroupMembersButton = !isPublic && isGroup && !commonNoShow;

  const deleteConvoAction = isPublic
    ? () => {
        deleteAllMessagesByConvoIdWithConfirmation(selectedConvoKey); // TODOLATER this does not delete the public group and showLeaveGroupByConvoId is not only working for closed groups
      }
    : () => {
        showLeaveGroupByConvoId(selectedConvoKey);
      };
  return (
    <div className="group-settings">
      <HeaderItem />
      <StyledName data-testid="right-panel-group-name">{displayNameInProfile}</StyledName>
      {showMemberCount && (
        <>
          <SpacerLG />
          <div role="button" className="subtle">
            {window.i18n('members', [`${subscriberCount}`])}
          </div>
          <SpacerLG />
        </>
      )}
      {showUpdateGroupNameButton && (
        <StyledGroupSettingsItem
          className="group-settings-item"
          role="button"
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          onClick={async () => {
            await showUpdateGroupNameByConvoId(selectedConvoKey);
          }}
        >
          {isPublic ? window.i18n('editGroup') : window.i18n('editGroupName')}
        </StyledGroupSettingsItem>
      )}
      {showAddRemoveModeratorsButton && (
        <>
          <StyledGroupSettingsItem
            className="group-settings-item"
            role="button"
            onClick={() => {
              showAddModeratorsByConvoId(selectedConvoKey);
            }}
          >
            {window.i18n('addModerators')}
          </StyledGroupSettingsItem>
          <StyledGroupSettingsItem
            className="group-settings-item"
            role="button"
            onClick={() => {
              showRemoveModeratorsByConvoId(selectedConvoKey);
            }}
          >
            {window.i18n('removeModerators')}
          </StyledGroupSettingsItem>
        </>
      )}

      {showUpdateGroupMembersButton && (
        <StyledGroupSettingsItem
          className="group-settings-item"
          role="button"
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          onClick={async () => {
            await showUpdateGroupMembersByConvoId(selectedConvoKey);
          }}
        >
          {window.i18n('groupMembers')}
        </StyledGroupSettingsItem>
      )}

      {hasDisappearingMessages && (
        <SessionDropdown
          label={window.i18n('disappearingMessages')}
          options={disappearingMessagesOptions}
          dataTestId="disappearing-messages-dropdown"
        />
      )}

      <MediaGallery documents={documents} media={media} />
      {isGroup && (
        <StyledLeaveButton>
          <SessionButton
            text={leaveGroupString}
            buttonColor={SessionButtonColor.Danger}
            buttonType={SessionButtonType.Simple}
            disabled={isKickedFromGroup || left}
            onClick={deleteConvoAction}
          />
        </StyledLeaveButton>
      )}
    </div>
  );
};
