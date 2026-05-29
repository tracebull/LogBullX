import { getApplicationServer } from '../../../constants';
import RequestOptions from '../../../shared/api/RequestOptions';
import { apiHelper } from '../../../shared/api/apiHelper';
import type { UsersSettings } from '../model/UsersSettings';

export interface PublicSettings {
  isAllowExternalRegistrations: boolean;
}

export const settingsApi = {
  async getPublicSettings(): Promise<PublicSettings> {
    const requestOptions: RequestOptions = new RequestOptions();
    return apiHelper.fetchGetJson(
      `${getApplicationServer()}/api/v1/users/settings/public`,
      requestOptions,
    );
  },

  async getSettings(): Promise<UsersSettings> {
    const requestOptions: RequestOptions = new RequestOptions();
    return apiHelper.fetchGetJson(
      `${getApplicationServer()}/api/v1/users/settings`,
      requestOptions,
    );
  },

  async updateSettings(settings: UsersSettings): Promise<UsersSettings> {
    const requestOptions: RequestOptions = new RequestOptions();
    requestOptions.setBody(JSON.stringify(settings));
    return apiHelper.fetchPutJson(
      `${getApplicationServer()}/api/v1/users/settings`,
      requestOptions,
    );
  },
};
