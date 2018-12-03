/* eslint-disable react/no-multi-comp */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';

import moment from 'moment';

import { Menu, message } from 'antd';

import { FormattedMessage, FormattedRelative, injectIntl } from 'react-intl';

import DropDown from '../common/DropDown';
import AccountLink from '../helpers/AccountLink';
import EntryLink from '../helpers/EntryLink';
import LinearProgress from '../common/LinearProgress';

import entryBodySummary from '../../utils/entry-body-summary';

import {
  getMyVotes,
  getMyReplies,
  getMyMentions,
  getMyFollows,
  getMyReblogs,
  getActivities
} from '../../backend/esteem-client';
import UserAvatar from '../elements/UserAvatar';

class ActivityListItem extends Component {
  date2key = s => {
    // if not date return self
    if (s.split('-').length !== 3) {
      return s;
    }

    return moment.utc(s).toDate();
  };

  render() {
    const { activity } = this.props;
    return (
      <Fragment>
        {activity.gkf && (
          <div className="group-title">
            <FormattedRelative value={this.date2key(activity.gk)} />
          </div>
        )}

        <div
          className={`activity-list-item${
            activity.read === 0 ? ' not-read' : ''
          }`}
        >
          <div className="activity-control">
            {activity.read === 0 && <span className="mark-read" />}
          </div>

          <div className="source">
            <AccountLink {...this.props} username={activity.source}>
              <UserAvatar user={activity.source} size="medium" />
            </AccountLink>
          </div>

          {/* Votes */}
          {['vote', 'unvote'].includes(activity.type) && (
            <div className="activity-content">
              <div className="first-line">
                <AccountLink {...this.props} username={activity.source}>
                  <a className="source-name"> {activity.source}</a>
                </AccountLink>
                <span className="activity-action">
                  <FormattedMessage
                    id="activities.vote-str"
                    values={{ p: activity.weight / 100 }}
                  />
                </span>
              </div>
              <div className="second-line">
                <EntryLink
                  {...this.props}
                  author={activity.author}
                  permlink={activity.permlink}
                >
                  <a className="post-link">{activity.permlink}</a>
                </EntryLink>
              </div>
            </div>
          )}

          {/* Replies */}
          {activity.type === 'reply' && (
            <div className="activity-content ">
              <div className="first-line">
                <AccountLink {...this.props} username={activity.source}>
                  <a className="source-name"> {activity.source}</a>
                </AccountLink>
                <span className="activity-action">
                  <FormattedMessage id="activities.reply-str" />
                </span>
                <div className="vert-separator" />
                <EntryLink
                  {...this.props}
                  author={activity.parent_author}
                  permlink={activity.parent_permlink}
                >
                  <a className="post-link">{activity.parent_permlink}</a>
                </EntryLink>
              </div>
              <div className="second-line">
                <EntryLink
                  {...this.props}
                  author={activity.author}
                  permlink={activity.permlink}
                >
                  <div className="markdown-view mini-markdown reply-body">
                    {entryBodySummary(activity.body, 100)}
                  </div>
                </EntryLink>
              </div>
            </div>
          )}

          {/* Mentions */}
          {activity.type === 'mention' && (
            <div className="activity-content">
              <div className="first-line">
                <AccountLink {...this.props} username={activity.source}>
                  <a className="source-name"> {activity.source}</a>
                </AccountLink>
                <span className="activity-action">
                  <FormattedMessage id="activities.mention-str" />
                </span>
              </div>
              <div className="second-line">
                <EntryLink
                  {...this.props}
                  author={activity.author}
                  permlink={activity.permlink}
                >
                  <a className="post-link">{activity.permlink}</a>
                </EntryLink>
              </div>
            </div>
          )}

          {/* Follows */}
          {['follow', 'unfollow', 'ignore'].includes(activity.type) && (
            <div className="activity-content">
              <div className="first-line">
                <AccountLink {...this.props} username={activity.source}>
                  <a className="source-name"> {activity.source}</a>
                </AccountLink>
              </div>
              <div className="second-line">
                {activity.type === 'follow' && (
                  <span className="follow-label">
                    <FormattedMessage id="activities.followed-str" />
                  </span>
                )}
                {activity.type === 'unfollow' && (
                  <span className="unfollow-label">
                    <FormattedMessage id="activities.unfollowed-str" />
                  </span>
                )}
                {activity.type === 'ignore' && (
                  <span className="ignore-label">
                    <FormattedMessage id="activities.ignored-str" />
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Reblogs */}
          {activity.type === 'reblog' && (
            <div className="activity-content">
              <div className="first-line">
                <AccountLink {...this.props} username={activity.source}>
                  <a className="source-name"> {activity.source}</a>
                </AccountLink>
                <span className="activity-action">
                  <FormattedMessage id="activities.reblog-str" />
                </span>
              </div>
              <div className="second-line">
                <EntryLink
                  {...this.props}
                  author={activity.author}
                  permlink={activity.permlink}
                >
                  <a className="post-link">{activity.permlink}</a>
                </EntryLink>
              </div>
            </div>
          )}
        </div>
      </Fragment>
    );
  }
}

ActivityListItem.propTypes = {
  activity: PropTypes.instanceOf(Object).isRequired
};

class Activities extends Component {
  constructor(props) {
    super(props);

    this.state = {
      activityType: 'all',
      activities: [],
      hasMore: true,
      loading: false
    };
  }

  componentDidMount() {
    this.loadActivities();

    this.scrollEl = document.querySelector('#activities-content');
    this.scrollEl.addEventListener('scroll', this.detectScroll);
  }

  componentWillUnmount() {
    this.scrollEl.removeEventListener('scroll', this.detectScroll);
  }

  detectScroll = () => {
    if (
      this.scrollEl.scrollTop + this.scrollEl.offsetHeight + 100 >=
      this.scrollEl.scrollHeight
    ) {
      this.bottomReached();
    }
  };

  bottomReached = () => {
    const { loading, hasMore } = this.state;
    if (loading || !hasMore) {
      return;
    }

    this.loadActivities();
  };

  typeChanged = item => {
    this.setState(
      { activityType: item.key, activities: [], hasMore: true },
      () => {
        this.loadActivities();
      }
    );
  };

  loadActivities = () => {
    const { activeAccount, intl } = this.props;
    const { activityType, activities } = this.state;

    const { username } = activeAccount;

    let since = null;

    if (activities.length > 0) {
      const lastAc = [...activities].pop();
      since = lastAc.id;
    }

    let prms;

    switch (activityType) {
      case 'votes':
        prms = getMyVotes(username, since);
        break;
      case 'replies':
        prms = getMyReplies(username, since);
        break;
      case 'mentions':
        prms = getMyMentions(username, since);
        break;
      case 'follows':
        prms = getMyFollows(username, since);
        break;
      case 'reblogs':
        prms = getMyReblogs(username, since);
        break;
      default:
        prms = getActivities(username, since);
    }

    this.setState({ loading: true });

    return prms
      .then(resp => {
        if (resp.length === 0) {
          this.setState({ hasMore: false });
          return;
        }

        const newActivities = [...activities, ...resp];
        this.setState({ activities: newActivities });

        return resp;
      })
      .catch(() => {
        message.error(intl.formatMessage({ id: 'g.server-error' }));
      })
      .finally(() => {
        this.setState({ loading: false });
      });
  };

  render() {
    const { activityType, activities, loading } = this.state;

    const filterMenu = (
      <Menu
        selectedKeys={[activityType]}
        className="surfer-dropdown-menu"
        onClick={this.typeChanged}
      >
        <Menu.Item key="all">
          <a>
            <FormattedMessage id="activities.type-all" />
          </a>
        </Menu.Item>
        <Menu.Item key="votes">
          <a>
            <FormattedMessage id="activities.type-votes" />
          </a>
        </Menu.Item>
        <Menu.Item key="replies">
          <a>
            <FormattedMessage id="activities.type-replies" />
          </a>
        </Menu.Item>
        <Menu.Item key="mentions">
          <a>
            <FormattedMessage id="activities.type-mentions" />
          </a>
        </Menu.Item>
        <Menu.Item key="follows">
          <a>
            <FormattedMessage id="activities.type-follows" />
          </a>
        </Menu.Item>
        <Menu.Item key="reblogs">
          <a>
            <FormattedMessage id="activities.type-reblogs" />
          </a>
        </Menu.Item>
      </Menu>
    );

    return (
      <div className="activities-dialog-content" id="activities-content">
        <div className="dialog-header">
          <div className="type-selection">
            <span className="type-label">
              <FormattedMessage id={`activities.type-${activityType}`} />
            </span>
            <DropDown menu={filterMenu} location="" />
          </div>
        </div>

        {loading && <LinearProgress />}

        {!loading &&
          activities.length === 0 && (
            <div className="activity-list empty-list">
              <span className="empty-text">
                <FormattedMessage id="activities.empty-list" />
              </span>
            </div>
          )}

        {activities.length > 0 && (
          <div className="activity-list">
            {activities.map(ac => (
              <ActivityListItem key={ac.id} {...this.props} activity={ac} />
            ))}
          </div>
        )}

        {loading && activities.length > 0 && <LinearProgress />}
      </div>
    );
  }
}

Activities.propTypes = {
  activeAccount: PropTypes.instanceOf(Object).isRequired,
  intl: PropTypes.instanceOf(Object).isRequired
};

export default injectIntl(Activities);
