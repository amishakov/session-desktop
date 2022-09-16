import React, { useState } from 'react';

// tslint:disable-next-line: no-submodule-imports
import useUpdate from 'react-use/lib/useUpdate';
import styled from 'styled-components';
import { useSet } from '../../hooks/useSet';
import { ToastUtils } from '../../session/utils';
import { BlockedNumberController } from '../../util';
import { SessionButton2, SessionButtonColor } from '../basic/SessionButton2';
import { SpacerLG } from '../basic/Text';
import { SessionIconButton } from '../icon';
import { MemberListItem } from '../MemberListItem';
import { SettingsTitleAndDescription } from './SessionSettingListItem';
// tslint:disable: use-simple-attributes

const BlockedEntriesContainer = styled.div`
  flex-shrink: 1;
  overflow: auto;
  min-height: 40px;
  max-height: 100%;
  background: var(--color-input-background); // TODO theming update
`;

const BlockedEntriesRoundedContainer = styled.div`
  overflow: hidden;
  border-radius: 16px;
  padding: var(--margins-lg);
  background: var(--color-input-background); // TODO theming update
`;

const BlockedContactsSection = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const BlockedContactListTitle = styled.div`
  display: flex;
  justify-content: space-between;
  min-height: 45px;
  align-items: center;
`;

const BlockedContactListTitleButtons = styled.div`
  display: flex;
  align-items: center;
`;

export const StyledBlockedSettingItem = styled.div<{ clickable: boolean }>`
  font-size: var(--font-size-md);
  padding: var(--margins-lg);

  background: var(--color-cell-background);
  color: var(--color-text);
  border-bottom: var(--border-session);

  cursor: ${props => (props.clickable ? 'pointer' : 'unset')};
`;

const BlockedEntries = (props: {
  blockedNumbers: Array<string>;
  selectedIds: Array<string>;
  addToSelected: (id: string) => void;
  removeFromSelected: (id: string) => void;
}) => {
  const { addToSelected, blockedNumbers, removeFromSelected, selectedIds } = props;
  return (
    <BlockedEntriesRoundedContainer>
      <BlockedEntriesContainer>
        {blockedNumbers.map(blockedEntry => {
          return (
            <MemberListItem
              pubkey={blockedEntry}
              isSelected={selectedIds.includes(blockedEntry)}
              key={blockedEntry}
              onSelect={addToSelected}
              onUnselect={removeFromSelected}
              disableBg={true}
            />
          );
        })}
      </BlockedEntriesContainer>
    </BlockedEntriesRoundedContainer>
  );
};

const NoBlockedContacts = () => {
  return <div>{window.i18n('noBlockedContacts')}</div>;
};

export const BlockedContactsList = () => {
  const [expanded, setExpanded] = useState(false);
  const {
    uniqueValues: selectedIds,
    addTo: addToSelected,
    removeFrom: removeFromSelected,
    empty: emptySelected,
  } = useSet<string>([]);

  const forceUpdate = useUpdate();

  const hasAtLeastOneSelected = Boolean(selectedIds.length);
  const blockedNumbers = BlockedNumberController.getBlockedNumbers();
  const noBlockedNumbers = !blockedNumbers.length;

  function toggleUnblockList() {
    if (blockedNumbers.length) {
      setExpanded(!expanded);
    }
  }

  async function unBlockThoseUsers() {
    if (selectedIds.length) {
      await BlockedNumberController.unblockAll(selectedIds);
      emptySelected();
      ToastUtils.pushToastSuccess('unblocked', window.i18n('unblocked'));
      forceUpdate();
    }
  }

  return (
    <BlockedContactsSection>
      <StyledBlockedSettingItem clickable={!noBlockedNumbers}>
        <BlockedContactListTitle onClick={toggleUnblockList}>
          <SettingsTitleAndDescription title={window.i18n('blockedSettingsTitle')} />
          {noBlockedNumbers ? (
            <NoBlockedContacts />
          ) : (
            <BlockedContactListTitleButtons>
              {hasAtLeastOneSelected && expanded ? (
                <SessionButton2
                  buttonColor={SessionButtonColor.Danger}
                  text={window.i18n('unblockUser')}
                  onClick={unBlockThoseUsers}
                />
              ) : null}
              <SpacerLG />
              <SessionIconButton
                iconSize={'large'}
                iconType={'chevron'}
                onClick={toggleUnblockList}
                iconRotation={expanded ? 0 : 180}
              />
              <SpacerLG />
            </BlockedContactListTitleButtons>
          )}
        </BlockedContactListTitle>
      </StyledBlockedSettingItem>
      {expanded && !noBlockedNumbers ? (
        <BlockedEntries
          blockedNumbers={blockedNumbers}
          selectedIds={selectedIds}
          addToSelected={addToSelected}
          removeFromSelected={removeFromSelected}
        />
      ) : null}
    </BlockedContactsSection>
  );
};
