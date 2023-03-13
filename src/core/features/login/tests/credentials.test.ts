// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { CoreSharedModule } from '@/core/shared.module';
import { findElement, mockSingleton, renderPageComponent, requireElement } from '@/testing/utils';
import { CoreLoginError } from '@classes/errors/loginerror';
import { CoreLoginComponentsModule } from '@features/login/components/components.module';
import { CoreLoginCredentialsPage } from '@features/login/pages/credentials/credentials';
import { CoreSites } from '@services/sites';
import { Http } from '@singletons';
import { of } from 'rxjs';
import { CoreLoginHelper } from '../services/login-helper';

describe('Credentials page', () => {

    const siteUrl = 'https://campus.example.edu';

    beforeEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockSingleton(Http, { get: () => of(null as any) });
    });

    it('renders', async () => {
        // Arrange.

        mockSingleton(CoreSites, {
            getPublicSiteConfigByUrl: async () => ({
                wwwroot: siteUrl,
                httpswwwroot: siteUrl,
                sitename: 'Example Campus',
                guestlogin: 0,
                rememberusername: 0,
                authloginviaemail: 0,
                registerauth: '',
                forgottenpasswordurl: '',
                authinstructions: '',
                authnoneenabled: 0,
                enablewebservices: 1,
                enablemobilewebservice: 1,
                maintenanceenabled: 0,
                maintenancemessage: '',
                typeoflogin: 1,
            }),
        });

        mockSingleton(CoreLoginHelper, { getAvailableSites: async () => [{ url: siteUrl, name: 'Example Campus' }] });

        // Act.
        const fixture = await renderPageComponent(CoreLoginCredentialsPage, {
            routeParams: { siteUrl },
            imports: [
                CoreSharedModule,
                CoreLoginComponentsModule,
            ],
        });

        // Assert.
        expect(findElement(fixture, '.core-siteurl', siteUrl)).not.toBeNull();
    });

    it('suggests contacting support after multiple failed attempts', async (done) => {
        // Arrange.
        mockSingleton(CoreSites, {
            getUserToken: () => {
                throw new CoreLoginError({
                    message: '',
                    errorcode: 'invalidlogin',
                });
            },
        });

        mockSingleton(CoreLoginHelper, { getAvailableSites: async () => [] });

        const fixture = await renderPageComponent(CoreLoginCredentialsPage, {
            routeParams: { siteUrl, siteConfig: { supportpage: '' } },
            imports: [CoreSharedModule, CoreLoginComponentsModule],
        });

        done();

        // Act.
        const form = requireElement<HTMLFormElement>(fixture, 'form');
        const formControls = fixture.componentInstance.credForm.controls;

        formControls['username'].setValue('student');
        formControls['password'].setValue('secret');

        for (let i = 0; i < 3; i++) {
            form.submit();

            await fixture.whenRenderingDone();
            await fixture.whenStable();
        }

        // Assert.
        expect(findElement(fixture, 'ion-label', 'core.login.exceededloginattempts')).not.toBeNull();
    });

});
